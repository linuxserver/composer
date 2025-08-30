import React from 'react';
import '../../styles/Items.css';

export const itemDefinition = {
  name: 'Mount Path',
  defaultSize: {
    width: 14,
    height: 8,
  },
  inputs: [
    {
      id: 'parentpath',
      name: 'Parent Path',
      compatibleTypes: ['mntpath'],
      multiple: false,
      color: '#f6e05e', // Yellow
    },
  ],
  outputs: [
    {
      id: 'mntpath',
      name: 'Mount Path',
      type: 'mntpath',
      multiple: true,
      color: '#f6e05e', // Yellow
    },
  ],
  // REMOVED: onConnection and onDisconnection logic is now centralized in App.jsx
};

export const ItemComponent = ({ itemData, onItemDataChange }) => {
  const path = itemData.data?.path ?? '/path';
  const parentPath = itemData.data?.parentPath || '';
  const fullPath = (parentPath + '/' + path).replace(/\/+/g, '/');

  const handleChange = (e) => {
    // Ensure parentPath is preserved when updating the local path
    onItemDataChange(itemData.id, { ...itemData.data, path: e.target.value });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '5px', boxSizing: 'border-box' }}>
      <label htmlFor={`mount-path-${itemData.id}`} style={{ fontSize: '0.8em', marginBottom: '4px' }}>Path:</label>
      <input
        id={`mount-path-${itemData.id}`}
        type="text"
        value={path}
        onChange={handleChange}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          backgroundColor: '#2d3748',
          color: 'white',
          border: '1px solid #4a5568',
          borderRadius: '4px',
          padding: '4px',
        }}
      />
      <div style={{ marginTop: '8px', fontSize: '0.8em', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <span style={{ fontWeight: 'bold' }}>Output: </span>
        <span>{fullPath}</span>
      </div>
    </div>
  );
};
