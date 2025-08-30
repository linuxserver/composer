import React from 'react';
import '../../styles/Items.css';

/**
 * The definition for the Parent Path item.
 * It has no inputs and provides a single 'mntpath' output.
 */
export const itemDefinition = {
  name: 'Parent Path',
  defaultSize: {
    width: 12,
    height: 8,
  },
  inputs: [], // This item is a root provider, so it has no inputs.
  outputs: [
    {
      id: 'mntpath',
      name: 'Path',
      type: 'mntpath', // This type is compatible with the MountPath's input.
      multiple: true, // One parent can provide its path to multiple children.
      color: '#f6e05e', // Yellow
    },
  ],
};

/**
 * The component rendered in the item's body.
 * It contains a single text field to define the base path.
 */
export const ItemComponent = ({ itemData, onItemDataChange }) => {
  // Use the path from the item's data, or default to '/mnt/user'.
  const path = itemData.data?.path ?? '/mnt/user';

  // When the input changes, call the handler passed down from App.jsx
  // to update this item's specific data state.
  const handleChange = (e) => {
    onItemDataChange(itemData.id, { path: e.target.value });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '5px', boxSizing: 'border-box' }}>
      <label htmlFor={`parent-path-${itemData.id}`} style={{ fontSize: '0.8em', marginBottom: '4px' }}>Base Path:</label>
      <input
        id={`parent-path-${itemData.id}`}
        type="text"
        value={path}
        onChange={handleChange}
        onClick={(e) => e.stopPropagation()} // Prevent selecting the item when clicking the input.
        style={{
          width: '100%',
          backgroundColor: '#2d3748',
          color: 'white',
          border: '1px solid #4a5568',
          borderRadius: '4px',
          padding: '4px',
        }}
      />
    </div>
  );
};
