# LSIO Composer

## Overview

LSIO Composer is a visual, node-based builder for Docker Compose files. It allows for the creation, modification, and sharing of complex container configurations through a graphical interface.

The primary use case is for container experts to design sophisticated templates where end-users only need to modify a few high-level variables (e.g., PUID, PGID, base paths) to adapt the configuration to their specific host environment. The application generates a standard `docker-compose.yml` file that includes embedded metadata, allowing the file to be dragged back into the application to restore the visual workspace for further editing.

## How It Works

The application state is managed in `src/App.jsx`, which holds the list of workspace items (nodes) and their connections.

1.  **Node-Based Graph:** Users add nodes from the sidebar onto a workspace. These nodes represent Docker services (containers), top-level compose elements (networks, volumes), or configuration overrides (environment variables, user IDs, paths).
2.  **Connections:** Users draw connections between node outputs and inputs. This defines the data flow. For example, a "Parent Path" node's output can connect to a "Mount Path" node's input, which in turn connects to a specific volume input on a container node.
3.  **State Propagation:** When a node's data is changed or a connection is made, the application logic in `App.jsx` propagates these changes through the graph. The `propagateItemUpdate` function traverses downstream connections, updating the data of connected nodes accordingly.
4.  **Compose Generation:** The `generateComposeFile` function iterates through all items on the workspace. It identifies items representing services, top-level networks, volumes, etc., and constructs a JavaScript object that mirrors the structure of a `docker-compose.yml` file. This object is then serialized into YAML format using the `js-yaml` library.
5.  **Metadata Embedding:** Before outputting the final file, the current workspace state (items, connections, transform) is serialized to a JSON string, encoded in Base64, and appended to the YAML file as a specially formatted comment (`# LSIO_COMPOSER_DATA::...`).
6.  **Re-importing:** When a file is dropped onto the application, it reads the file content, looks for the metadata comment, decodes the Base64 string, and parses the JSON to restore the entire workspace state.

---

## Developer Guide

This section details the dynamic architecture of the application, enabling developers to extend its functionality by creating custom nodes or integrating with custom container registries.

### Dynamic Item Loading

The application discovers and loads all available node types at runtime. This is achieved through two mechanisms:

1.  **Local Item Modules:** `import.meta.glob('./components/items/*.jsx', { eager: true })` in `App.jsx` loads every local item module synchronously on application start. These are used for generic overrides and top-level compose elements.
2.  **Remote API Fetching:** Container definitions are fetched from a remote API endpoint. The default endpoint for LinuxServer.io containers is `https://api.linuxserver.io/api/v1/images?include_config=true&include_deprecated=false`. The application parses the JSON response from this endpoint to dynamically generate container nodes.

For a local module to be recognized as a valid item, it must export two specific named constants:
1.  `itemDefinition`: A static JavaScript object that defines the node's properties, including its name, default size, and its static `inputs` and `outputs` (connectors).
2.  `ItemComponent`: A React component that renders the UI within the node's body. This component receives `itemData` and `onItemDataChange` as props to read and update the node's internal state.

### API Data Format

To integrate a custom container registry, the API endpoint must return a JSON object with a structure compatible with the application's parser. The core data is expected under `data.repositories.<repository_name>`. The full API spec can be seen [here](https://api.linuxserver.io/).

The following is a breakdown of the expected format for each container object in the repository array:

```json
{
  "name": "adguardhome-sync",
  "project_logo": "https://.../adguardhomesync-icon.png",
  "config": {
    "env_vars": [
      { "name": "PUID", "value": "1000" },
      { "name": "PGID", "value": "1000" }
    ],
    "volumes": [
      { "path": "/config", "host_path": "/path/to/config" }
    ],
    "ports": [
      { "external": "8080", "internal": "8080" }
    ],
    "devices": [
      { "path": "/dev/snd", "host_path": "/dev/snd" }
    ],
    "security_opt": [
      { "compose_var": "seccomp:unconfined" }
    ],
    "custom": [
      { "name_compose": "shm_size", "value": "1gb" }
    ],
    "networking": "host",
    "privileged": true
  }
}
```

**Key Fields:**

*   **`name`**: (string) The unique identifier for the container. Used as the node type and default `container_name`.
*   **`project_logo`**: (string) URL to the icon displayed in the container node.
*   **`config`**: (object) Contains the default Docker Compose configuration.
    *   **`env_vars`**: (array of objects) Each object with a `name` and `value` key will be a default environment variable.
    *   **`volumes`**: (array of objects) Each object's `path` key defines a container-side path for a volume mount.
    *   **`ports`**: (array of objects) Each object with `external` and `internal` keys defines a default port mapping.
    *   **`devices`**: (array of objects) Each object with `host_path` and `path` defines a device mapping.
    *   **`security_opt`**: (array of objects) Each object's `compose_var` is added to the `security_opt` list.
    *   **`custom`**: (array of objects) For arbitrary top-level service keys. The `name_compose` field is the YAML key, and `value` is its value (e.g., `shm_size: 1gb`).
    *   **`networking`**: (string) Sets the default `network_mode`.
    *   **`privileged`**: (boolean) Sets the `privileged` flag.

### Dynamic Connectors

Certain nodes, such as containers and the `EnvVarOverride` node, feature connectors that are generated dynamically based on the node's internal state. This logic resides in the `getDynamicDefinition` helper function in `src/components/WorkspaceItem.jsx`.

-   **EnvVarOverride Example:** The `EnvVarOverride` node's output connector is defined by the "Key" field in its UI. If a user enters `PUID` as the key, the `getDynamicDefinition` function generates an output connector with `id: 'env_out:PUID'` and `name: 'PUID'`. This allows for a direct, context-aware connection to a container's environment variable input.

-   **Container Example:** Container nodes generate dynamic inputs for every environment variable and volume mount defined in their configuration forms. For an environment variable with the key `TZ`, an input with `id: 'env:TZ'` is created. For a volume mapping like `changeme:/config`, an input with `id: 'volume:/config'` is created. This allows other nodes to target and override specific entries in these lists.

### Creating a Custom Override Module

To add a new draggable node (e.g., a new type of override), follow these steps:

1.  **Create the File:** Add a new `.jsx` file in `src/components/items/`, for example, `MyOverride.jsx`.

2.  **Export `itemDefinition`:** Define the static properties of your node. The `outputs` array is critical. The `type` property of an output determines which inputs it can connect to.

    ```javascript
    // src/components/items/MyOverride.jsx
    export const itemDefinition = {
      name: 'My Override',
      defaultSize: { width: 14, height: 8 },
      inputs: [], // This is a provider, so no inputs.
      outputs: [
        {
          id: 'my_override_out',
          name: 'Value',
          type: 'env_value', // Connects to container props like 'user', 'shm_size', or env vars.
          multiple: true,
          color: '#your_hex_color',
        },
      ],
    };
    ```

3.  **Export `ItemComponent`:** Create the React component for the node's UI. It must call the `onItemDataChange` prop to update its state in the main application.

    ```javascript
    // src/components/items/MyOverride.jsx
    import React from 'react';

    export const ItemComponent = ({ itemData, onItemDataChange }) => {
      const value = itemData.data?.value ?? 'default-value';
      const handleChange = (e) => {
        onItemDataChange(itemData.id, { value: e.target.value });
      };
      return (
        <div>
          <label>My Value</label>
          <input type="text" value={value} onChange={handleChange} />
        </div>
      );
    };
    ```

4.  **Update Propagation Logic:** The `getProviderOutputValue` function in `App.jsx` must be updated to extract the primary output value from your new node type. Add a case for your new node's `name`.

    ```javascript
    // src/App.jsx -> getProviderOutputValue
    switch (itemDef.name) {
      // ... existing cases
      case 'My Override':
        return item.data.value ?? '';
    }
    ```

### Adding Custom Connectors to Containers

To add a new static input to all container nodes:

1.  **Modify Container Definition:** Open `src/components/items/Container.jsx`. Locate the `createContainerDefinition` function.
2.  **Add to `inputs` array:** Add a new object to the `inputs` array.
    -   `id`: Must be unique. Use the prefix `prop:` for simple property overrides (e.g., `prop:hostname`).
    -   `name`: The label displayed in the UI.
    -   `compatibleTypes`: An array of `type` strings from output connectors that can connect here.
    -   `multiple`: `false` for single-value properties.

    ```javascript
    // src/components/items/Container.jsx -> createContainerDefinition -> inputs array
    inputs: [
        // ... existing inputs
        {
          id: 'prop:hostname',
          name: 'Hostname',
          compatibleTypes: ['env_value'],
          multiple: false,
          color: '#your_hex_color'
        },
    ],
    ```

3.  **Update Propagation Logic:** In `App.jsx`, the `propagateItemUpdate` function must handle this new input. Add a case that checks for the connector `id`.

    ```javascript
    // src/App.jsx -> propagateItemUpdate
    } else if (toConnectorId.startsWith('prop:')) {
        const propName = toConnectorId.substring('prop:'.length);
        if (newToData[propName] !== incomingValue) {
            newToData[propName] = incomingValue;
            dataChanged = true;
        }
    }
    ```

4.  **Update Container UI:** In the `ItemComponent` within `Container.jsx`, find the corresponding form field (e.g., the hostname input) and make it `readOnly` when it is linked.

    ```javascript
    // src/components/items/Container.jsx -> ItemComponent
    const isPropLinked = (propName) => !!linkedInputs[`prop:${propName}`];
    // ...
    <input
      type="text"
      value={serviceData.hostname || ''}
      readOnly={isPropLinked('hostname')}
    />
    ```

## Project Structure

```
.
└── src
    ├── App.jsx            # Main application component, state management, and core logic.
    ├── components
    │   ├── items/         # Directory for all dynamic node modules.
    │   │   ├── Container.jsx # The component and definition factory for all containers.
    │   │   └── ...        # Each file is a unique node type.
    │   ├── Sidebar.jsx    # Renders the list of draggable items.
    │   ├── Workspace.jsx  # The interactive canvas for nodes and connections.
    │   └── WorkspaceItem.jsx # Renders a single node and its dynamic connectors.
    └── styles             # CSS modules for components.
```

## Getting Started

1.  Clone the repository.
2.  Install dependencies:
    ```sh
    npm install
    ```
3.  Run the development server:
    ```sh
    npm run dev
    ```
