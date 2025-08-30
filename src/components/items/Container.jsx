import React from 'react';
import '../../styles/Items.css';

// --- Generic List Editor Components ---

const KeyValueListEditor = ({ title, items, onChange, keyName = 'key', valueName = 'value', isItemLinked, keyPlaceholder = 'key', valuePlaceholder = 'value' }) => {
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const handleAddItem = (e) => {
    e.stopPropagation();
    onChange([...items, { [keyName]: '', [valueName]: '' }]);
  };

  const handleRemoveItem = (e, index) => {
    e.stopPropagation();
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="form-section">
      <label>{title}</label>
      {items.map((item, index) => {
        const isLinked = isItemLinked ? isItemLinked(item, index) : false;
        return (
          <div key={index} className="list-item-editor">
            <input
              type="text"
              placeholder={keyPlaceholder}
              value={item[keyName] || ''}
              onChange={(e) => handleItemChange(index, keyName, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              readOnly={isLinked}
            />
            <input
              type="text"
              placeholder={valuePlaceholder}
              value={item[valueName] || ''}
              onChange={(e) => handleItemChange(index, valueName, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              readOnly={isLinked}
            />
            <button onMouseDown={(e) => handleRemoveItem(e, index)} className="remove-btn" disabled={isLinked}>-</button>
          </div>
        )
      })}
      <button onMouseDown={handleAddItem} className="add-btn">+ Add</button>
    </div>
  );
};

const StringListEditor = ({ title, items, onChange, placeholder, isItemLinked }) => {
    const handleItemChange = (index, value) => {
      const newItems = [...items];
      newItems[index] = value;
      onChange(newItems);
    };
  
    const handleAddItem = (e) => {
      e.stopPropagation();
      onChange([...items, '']);
    };
  
    const handleRemoveItem = (e, index) => {
      e.stopPropagation();
      onChange(items.filter((_, i) => i !== index));
    };
  
    return (
      <div className="form-section">
        <label>{title}</label>
        {items.map((item, index) => {
          const isLinked = isItemLinked ? isItemLinked(item, index) : false;
          return (
            <div key={index} className="list-item-editor">
              <input
                type="text"
                placeholder={placeholder}
                value={item}
                onChange={(e) => handleItemChange(index, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 'calc(100% - 30px)' }}
                readOnly={isLinked}
              />
              <button onMouseDown={(e) => handleRemoveItem(e, index)} className="remove-btn" disabled={isLinked}>-</button>
            </div>
          )
        })}
        <button onMouseDown={handleAddItem} className="add-btn">+ Add</button>
      </div>
    );
};

// --- Main Component ---

export const ItemComponent = ({ itemData, onItemDataChange }) => {
  const serviceData = itemData.data || {};
  const linkedInputs = serviceData.linkedInputs || {};

  const handleChange = (field, value) => {
    onItemDataChange(itemData.id, { ...serviceData, [field]: value });
  };

  const handleNestedChange = (parentField, childField, value) => {
    onItemDataChange(itemData.id, {
        ...serviceData,
        [parentField]: {
            ...(serviceData[parentField] || {}),
            [childField]: value,
        },
    });
  };

  const handleListChange = (field, newList) => {
    onItemDataChange(itemData.id, { ...serviceData, [field]: newList });
  };
  
  const ensureArrayFormat = (data, keyName = 'key', valueName = 'value') => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      return Object.entries(data).map(([k, v]) => ({ [keyName]: k, [valueName]: v }));
  };

  const isPropLinked = (propName) => !!linkedInputs[`prop:${propName}`];

  return (
    <div className="item-form-container scrollable">
      <details open>
        <summary>Basic Configuration</summary>
        <div className="form-section">
          <label htmlFor={`image-${itemData.id}`}>Image</label>
          <input id={`image-${itemData.id}`} type="text" value={serviceData.image || ''} onChange={(e) => handleChange('image', e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="e.g., nginx:latest" />
        </div>
        <div className="form-section">
          <label htmlFor={`container_name-${itemData.id}`}>Container Name</label>
          <input id={`container_name-${itemData.id}`} type="text" value={serviceData.container_name || ''} onChange={(e) => handleChange('container_name', e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="Optional custom name" />
        </div>
        <div className="form-section">
          <label htmlFor={`command-${itemData.id}`}>Command</label>
          <textarea id={`command-${itemData.id}`} value={serviceData.command || ''} onChange={(e) => handleChange('command', e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="Override the default command" />
        </div>
        <div className="form-section">
          <label htmlFor={`entrypoint-${itemData.id}`}>Entrypoint</label>
          <textarea id={`entrypoint-${itemData.id}`} value={serviceData.entrypoint || ''} onChange={(e) => handleChange('entrypoint', e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="Override the default entrypoint" />
        </div>
      </details>
      
      <details>
        <summary>Lifecycle & Restart</summary>
        <div className="form-section">
          <label htmlFor={`restart-${itemData.id}`}>Restart Policy</label>
          <select id={`restart-${itemData.id}`} value={serviceData.restart || 'no'} onChange={(e) => handleChange('restart', e.target.value)} onClick={(e) => e.stopPropagation()} disabled={isPropLinked('restart')}>
              <option value="no">No</option>
              <option value="always">Always</option>
              <option value="on-failure">On Failure</option>
              <option value="unless-stopped">Unless Stopped</option>
          </select>
        </div>
        <div className="form-section">
          <label htmlFor={`stop_signal-${itemData.id}`}>Stop Signal</label>
          <input id={`stop_signal-${itemData.id}`} type="text" value={serviceData.stop_signal || ''} onChange={(e) => handleChange('stop_signal', e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="e.g., SIGUSR1" />
        </div>
        <div className="form-section">
          <label htmlFor={`stop_grace_period-${itemData.id}`}>Stop Grace Period</label>
          <input id={`stop_grace_period-${itemData.id}`} type="text" value={serviceData.stop_grace_period || ''} onChange={(e) => handleChange('stop_grace_period', e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="e.g., 1m30s" />
        </div>
        <div className="form-section horizontal">
          <input id={`init-${itemData.id}`} type="checkbox" checked={!!serviceData.init} onChange={(e) => handleChange('init', e.target.checked)} onClick={(e) => e.stopPropagation()} />
          <label htmlFor={`init-${itemData.id}`}>Enable Init Process</label>
        </div>
        <div className="form-section horizontal">
          <input id={`stdin_open-${itemData.id}`} type="checkbox" checked={!!serviceData.stdin_open} onChange={(e) => handleChange('stdin_open', e.target.checked)} onClick={(e) => e.stopPropagation()} />
          <label htmlFor={`stdin_open-${itemData.id}`}>Stdin Open</label>
        </div>
        <div className="form-section horizontal">
          <input id={`tty-${itemData.id}`} type="checkbox" checked={!!serviceData.tty} onChange={(e) => handleChange('tty', e.target.checked)} onClick={(e) => e.stopPropagation()} />
          <label htmlFor={`tty-${itemData.id}`}>Allocate TTY</label>
        </div>
      </details>

      <details>
        <summary>Networking</summary>
        <div className="form-section">
            <label>Network Mode</label>
            <input type="text" value={serviceData.network_mode || ''} onChange={(e) => handleChange('network_mode', e.target.value)} placeholder="e.g., host, bridge, none"/>
        </div>
        <StringListEditor title="Networks" items={serviceData.networks || []} onChange={(newList) => handleListChange('networks', newList)} placeholder="e.g., my_backend_net" isItemLinked={(item) => (serviceData.linkedNetworks || []).includes(item)} />
        <StringListEditor title="Ports (HOST:CONTAINER)" items={serviceData.ports || []} onChange={(newList) => handleListChange('ports', newList)} placeholder="e.g., 8080:80" />
        <StringListEditor title="Expose Ports" items={serviceData.expose || []} onChange={(newList) => handleListChange('expose', newList)} placeholder="e.g., 3000" />
        <StringListEditor title="Links" items={serviceData.links || []} onChange={(newList) => handleListChange('links', newList)} placeholder="db:database" />
        <div className="form-section">
            <label>Hostname</label>
            <input type="text" value={serviceData.hostname || ''} onChange={(e) => handleChange('hostname', e.target.value)} placeholder="Custom container hostname" readOnly={isPropLinked('hostname')} />
        </div>
        <div className="form-section">
            <label>Domain Name</label>
            <input type="text" value={serviceData.domainname || ''} onChange={(e) => handleChange('domainname', e.target.value)} placeholder="e.g., example.com" />
        </div>
        <StringListEditor title="DNS Servers" items={serviceData.dns || []} onChange={(newList) => handleListChange('dns', newList)} placeholder="e.g., 8.8.8.8" />
        <StringListEditor title="DNS Search Domains" items={serviceData.dns_search || []} onChange={(newList) => handleListChange('dns_search', newList)} placeholder="e.g., example.com" />
        <KeyValueListEditor title="Extra Hosts (HOST:IP)" items={ensureArrayFormat(serviceData.extra_hosts, 'key', 'value')} onChange={(newList) => handleListChange('extra_hosts', newList)} keyPlaceholder='somehost' valuePlaceholder='192.168.1.100' />
      </details>

      <details>
        <summary>Volumes & Storage</summary>
        <StringListEditor title="Volumes / Mounts (SOURCE:TARGET)" items={serviceData.volumes || []} onChange={(newList) => handleListChange('volumes', newList)} placeholder="e.g., /host/path:/container/path" isItemLinked={(item) => { const parts = item.split(':'); const target = parts.length > 1 ? parts[1] : parts[0]; return !!linkedInputs[`volume:${target}`]; }} />
        <StringListEditor title="Volumes From" items={serviceData.volumes_from || []} onChange={(newList) => handleListChange('volumes_from', newList)} placeholder="e.g., other_service:ro" />
        <StringListEditor title="Temp FS" items={serviceData.tmpfs || []} onChange={(newList) => handleListChange('tmpfs', newList)} placeholder="e.g., /run" />
      </details>

      <details>
        <summary>Environment & Labels</summary>
        <KeyValueListEditor title="Environment Variables" items={ensureArrayFormat(serviceData.environment)} onChange={(newArray) => handleListChange('environment', newArray)} isItemLinked={(item) => !!linkedInputs[`env:${item.key}`]} />
        <StringListEditor title="Env Files" items={serviceData.env_file || []} onChange={(newList) => handleListChange('env_file', newList)} placeholder="e.g., ./common.env" />
        <KeyValueListEditor title="Labels" items={ensureArrayFormat(serviceData.labels)} onChange={(newArray) => handleListChange('labels', newArray)} isItemLinked={(item) => !!item.isLinked} />
        <KeyValueListEditor title="Annotations" items={ensureArrayFormat(serviceData.annotations)} onChange={(newArray) => handleListChange('annotations', newArray)} keyPlaceholder='com.example.foo' valuePlaceholder='bar'/>
      </details>

      <details>
        <summary>Dependencies</summary>
        <StringListEditor title="Depends On" items={serviceData.depends_on || []} onChange={(newList) => handleListChange('depends_on', newList)} placeholder="e.g., db" isItemLinked={(item) => (serviceData.linkedDependsOn || []).includes(item)} />
        {/* Note: Long syntax for depends_on can be added with a complex list editor if needed */}
      </details>
      
      <details>
        <summary>Secrets & Configs</summary>
        <StringListEditor title="Secrets" items={serviceData.secrets || []} onChange={(newList) => handleListChange('secrets', newList)} placeholder="e.g., db_password" isItemLinked={(item) => (serviceData.linkedSecrets || []).includes(item)} />
        <StringListEditor title="Configs" items={serviceData.configs || []} onChange={(newList) => handleListChange('configs', newList)} placeholder="e.g., app_config" isItemLinked={(item) => (serviceData.linkedConfigs || []).includes(item)} />
      </details>

      <details>
        <summary>Healthcheck</summary>
        <div className="form-section">
            <label>Test Command</label>
            <input type="text" value={serviceData.healthcheck?.test || ''} onChange={(e) => handleNestedChange('healthcheck', 'test', e.target.value)} placeholder="e.g., curl -f http://localhost" />
        </div>
        <div className="form-section">
            <label>Interval</label>
            <input type="text" value={serviceData.healthcheck?.interval || ''} onChange={(e) => handleNestedChange('healthcheck', 'interval', e.target.value)} placeholder="e.g., 30s" />
        </div>
        <div className="form-section">
            <label>Timeout</label>
            <input type="text" value={serviceData.healthcheck?.timeout || ''} onChange={(e) => handleNestedChange('healthcheck', 'timeout', e.target.value)} placeholder="e.g., 10s" />
        </div>
        <div className="form-section">
            <label>Retries</label>
            <input type="number" value={serviceData.healthcheck?.retries || ''} onChange={(e) => handleNestedChange('healthcheck', 'retries', e.target.value)} placeholder="e.g., 3" />
        </div>
        <div className="form-section">
            <label>Start Period</label>
            <input type="text" value={serviceData.healthcheck?.start_period || ''} onChange={(e) => handleNestedChange('healthcheck', 'start_period', e.target.value)} placeholder="e.g., 40s" />
        </div>
        <div className="form-section horizontal">
            <input id={`healthcheck-disable-${itemData.id}`} type="checkbox" checked={!!serviceData.healthcheck?.disable} onChange={(e) => handleNestedChange('healthcheck', 'disable', e.target.checked)} onClick={(e) => e.stopPropagation()} />
            <label htmlFor={`healthcheck-disable-${itemData.id}`}>Disable Healthcheck</label>
        </div>
      </details>

      <details>
        <summary>Security & Permissions</summary>
        <div className="form-section">
            <label>User</label>
            <input type="text" value={serviceData.user || ''} onChange={(e) => handleChange('user', e.target.value)} placeholder="e.g., 1000:1000" readOnly={isPropLinked('user')} />
        </div>
        <StringListEditor title="Security Options" items={serviceData.security_opt || []} onChange={(newList) => handleListChange('security_opt', newList)} placeholder="e.g., no-new-privileges:true" isItemLinked={(item) => (serviceData.linkedSecurityOpt || []).includes(item)} />
        <StringListEditor title="Capabilities to Add" items={serviceData.cap_add || []} onChange={(newList) => handleListChange('cap_add', newList)} placeholder="e.g., NET_ADMIN" />
        <StringListEditor title="Capabilities to Drop" items={serviceData.cap_drop || []} onChange={(newList) => handleListChange('cap_drop', newList)} placeholder="e.g., ALL" />
        <StringListEditor title="Additional Groups" items={serviceData.group_add || []} onChange={(newList) => handleListChange('group_add', newList)} placeholder="e.g., mail" />
        <div className="form-section horizontal">
            <input id={`privileged-${itemData.id}`} type="checkbox" checked={!!serviceData.privileged} onChange={(e) => handleChange('privileged', e.target.checked)} onClick={(e) => e.stopPropagation()} />
            <label htmlFor={`privileged-${itemData.id}`}>Privileged</label>
        </div>
        <div className="form-section horizontal">
            <input id={`read_only-${itemData.id}`} type="checkbox" checked={!!serviceData.read_only} onChange={(e) => handleChange('read_only', e.target.checked)} onClick={(e) => e.stopPropagation()} />
            <label htmlFor={`read_only-${itemData.id}`}>Read-only Filesystem</label>
        </div>
      </details>

      <details>
        <summary>Resources & Limits</summary>
        <div className="form-section">
            <label>CPUs</label>
            <input type="text" value={serviceData.cpus || ''} onChange={(e) => handleChange('cpus', e.target.value)} placeholder="e.g., 0.5" />
        </div>
        <div className="form-section">
            <label>CPU Shares</label>
            <input type="number" value={serviceData.cpu_shares || ''} onChange={(e) => handleChange('cpu_shares', e.target.value)} placeholder="e.g., 1024" />
        </div>
        <div className="form-section">
            <label>Memory Limit</label>
            <input type="text" value={serviceData.mem_limit || ''} onChange={(e) => handleChange('mem_limit', e.target.value)} placeholder="e.g., 1g" />
        </div>
        <div className="form-section">
            <label>Memory Reservation</label>
            <input type="text" value={serviceData.mem_reservation || ''} onChange={(e) => handleChange('mem_reservation', e.target.value)} placeholder="e.g., 256m" />
        </div>
        <div className="form-section">
            <label>PIDs Limit</label>
            <input type="number" value={serviceData.pids_limit || ''} onChange={(e) => handleChange('pids_limit', e.target.value)} placeholder="e.g., 100" />
        </div>
         <div className="form-section">
          <label>SHM Size</label>
          <input type="text" value={serviceData.shm_size || ''} onChange={(e) => handleChange('shm_size', e.target.value)} placeholder="e.g., 1g or 256m" readOnly={isPropLinked('shm_size')} />
        </div>
      </details>

      <details>
        <summary>Advanced & Kernel</summary>
        <StringListEditor title="Devices (HOST:CONTAINER)" items={serviceData.devices || []} onChange={(newList) => handleListChange('devices', newList)} placeholder="e.g., /dev/dri:/dev/dri" isItemLinked={(item) => (serviceData.linkedDevices || []).includes(item)} />
        <KeyValueListEditor title="Sysctls" items={ensureArrayFormat(serviceData.sysctls)} onChange={(newList) => handleListChange('sysctls', newList)} keyPlaceholder='net.core.somaxconn' valuePlaceholder='1024' />
        <div className="form-section">
          <label>PID Mode</label>
          <input type="text" value={serviceData.pid || ''} onChange={(e) => handleChange('pid', e.target.value)} placeholder="e.g., host" />
        </div>
        <div className="form-section">
          <label>UTS Mode</label>
          <input type="text" value={serviceData.uts || ''} onChange={(e) => handleChange('uts', e.target.value)} placeholder="e.g., host" />
        </div>
        <div className="form-section">
          <label>User Namespace Mode</label>
          <input type="text" value={serviceData.userns_mode || ''} onChange={(e) => handleChange('userns_mode', e.target.value)} placeholder="e.g., host" />
        </div>
        <div className="form-section">
            <label>OOM Score Adjustment</label>
            <input type="number" value={serviceData.oom_score_adj || ''} onChange={(e) => handleChange('oom_score_adj', e.target.value)} min="-1000" max="1000" placeholder="-1000 to 1000" />
        </div>
        <div className="form-section horizontal">
            <input id={`oom_kill_disable-${itemData.id}`} type="checkbox" checked={!!serviceData.oom_kill_disable} onChange={(e) => handleChange('oom_kill_disable', e.target.checked)} onClick={(e) => e.stopPropagation()} />
            <label htmlFor={`oom_kill_disable-${itemData.id}`}>Disable OOM Killer</label>
        </div>
      </details>

      <details>
        <summary>Deployment & Build</summary>
        <div className="form-section">
          <label>Pull Policy</label>
          <select value={serviceData.pull_policy || 'missing'} onChange={(e) => handleChange('pull_policy', e.target.value)}>
            <option value="always">Always</option>
            <option value="missing">Missing</option>
            <option value="never">Never</option>
            <option value="build">Build</option>
          </select>
        </div>
        <div className="form-section">
          <label>Platform</label>
          <input type="text" value={serviceData.platform || ''} onChange={(e) => handleChange('platform', e.target.value)} placeholder="e.g., linux/amd64" />
        </div>
        <div className="form-section">
          <label>Scale</label>
          <input type="number" value={serviceData.scale || ''} onChange={(e) => handleChange('scale', e.target.value)} min="0" placeholder="Number of containers" />
        </div>
        <StringListEditor title="Profiles" items={serviceData.profiles || []} onChange={(newList) => handleListChange('profiles', newList)} placeholder="e.g., frontend" />
      </details>

    </div>
  );
};

export const createContainerDefinition = (container) => {
  const config = container.config || {};
  const defaultData = {
    restart: 'unless-stopped',
    healthcheck: {},
    // Initialize all new fields with empty/default values
    command: '', entrypoint: '', working_dir: '', stop_signal: '', stop_grace_period: '', init: false, stdin_open: false, tty: false,
    network_mode: '', hostname: '', domainname: '', mac_address: '', dns: [], dns_search: [], dns_opt: [], extra_hosts: [], expose: [], links: [],
    volumes: [], volumes_from: [], tmpfs: [],
    environment: [], env_file: [], labels: [], annotations: [],
    depends_on: [],
    secrets: [], configs: [],
    security_opt: [], cap_add: [], cap_drop: [], group_add: [], privileged: false, read_only: false, user: '',
    cpus: '', cpu_shares: '', mem_limit: '', mem_reservation: '', pids_limit: '', shm_size: '',
    devices: [], sysctls: [], pid: '', uts: '', userns_mode: '', oom_score_adj: '', oom_kill_disable: false,
    pull_policy: 'missing', platform: '', scale: '', profiles: [],
  };

  defaultData.image = `lscr.io/linuxserver/${container.name}:latest`;
  defaultData.container_name = container.name;

  if (config.ports && config.ports.length > 0) defaultData.ports = config.ports.map(p => `${p.external}:${p.internal}`);
  if (config.volumes && config.volumes.length > 0) defaultData.volumes = config.volumes.map(v => `changeme:${v.path}`);
  if (config.env_vars && config.env_vars.length > 0) defaultData.environment = config.env_vars.map(env => ({ key: env.name, value: env.value }));
  
  if (config.custom && config.custom.length > 0) config.custom.forEach(c => { if (c.name_compose) defaultData[c.name_compose] = c.value; });
  if (config.security_opt && config.security_opt.length > 0) defaultData.security_opt = config.security_opt.map(s => s.compose_var);
  if (config.devices && config.devices.length > 0) defaultData.devices = config.devices.map(d => `${d.host_path}:${d.path}`);
  if (config.caps && config.caps.length > 0) defaultData.cap_add = config.caps.map(c => c.cap_add);
  if (config.networking) defaultData.network_mode = config.networking;
  if (config.privileged) defaultData.privileged = true;
  if (config.hostname?.hostname) defaultData.hostname = config.hostname.hostname;
  if (config.mac_address?.mac_address) defaultData.mac_address = config.mac_address.mac_address;

  return {
    name: container.name,
    icon: container.project_logo,
    defaultSize: { width: 24, height: 20 },
    defaultData,
    inputs: [
        { id: 'depends_on', name: 'Depends On', compatibleTypes: ['service'], multiple: true, color: '#63b3ed' },
        // --- Generic Array Inputs ---
        { id: 'labels_in', name: 'Labels', compatibleTypes: ['label'], multiple: true, color: '#a0aec0' }, // Gray
        { id: 'networks_in', name: 'Networks', compatibleTypes: ['network'], multiple: true, color: '#48bb78' },
        { id: 'secrets_in', name: 'Secrets', compatibleTypes: ['secret'], multiple: true, color: '#ed64a6' },
        { id: 'configs_in', name: 'Configs', compatibleTypes: ['config'], multiple: true, color: '#d69e2e' },
        { id: 'devices_in', name: 'Devices', compatibleTypes: ['mntpath'], multiple: true, color: '#667eea' }, // Indigo
        { id: 'security_opt_in', name: 'Security Opts', compatibleTypes: ['string_value'], multiple: true, color: '#718096' }, // Slate
        // --- Property Overrides ---
        { id: 'prop:restart', name: 'Restart', compatibleTypes: ['env_value'], multiple: false, color: '#4299e1' }, // Blue
        { id: 'prop:user', name: 'User', compatibleTypes: ['env_value'], multiple: false, color: '#9f7aea' }, // Purple
        { id: 'prop:shm_size', name: 'SHM Size', compatibleTypes: ['env_value'], multiple: false, color: '#38b2ac' }, // Teal
        // All other inputs are dynamic (volumes, environment variables)
    ],
    outputs: [
        { id: 'service', name: 'Service', type: 'service', multiple: true, color: '#63b3ed' },
        { id: 'portmap', name: 'Ports', type: 'portmap', multiple: true, color: '#f56565' }, 
    ],
  };
};
