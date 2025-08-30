import React from 'react';
import '../../styles/Items.css';

/**
 * The definition for the Env Var Override item.
 * Its output is dynamic based on the user-provided key.
 */
export const itemDefinition = {
  name: 'Env Var',
  defaultSize: {
    width: 14,
    height: 10,
  },
  inputs: [],
  // The actual output is generated dynamically in WorkspaceItem.jsx
  outputs: [
    {
      id: 'env_out', // This is a placeholder
      name: 'Value',
      type: 'env_value',
      multiple: true,
      color: '#f6ad55', // Orange
    },
  ],
};

/**
 * The component rendered in the item's body.
 * It contains fields for an environment variable's key and value.
 */
export const ItemComponent = ({ itemData, onItemDataChange }) => {
  const key = itemData.data?.key ?? '';
  const value = itemData.data?.value ?? '';

  const handleChange = (field, fieldValue) => {
    onItemDataChange(itemData.id, { ...itemData.data, [field]: fieldValue });
  };

  return (
    <div className="item-form-container">
      <div className="form-section">
        <label htmlFor={`env-key-${itemData.id}`}>Key</label>
        <input
          id={`env-key-${itemData.id}`}
          type="text"
          value={key}
          onChange={(e) => handleChange('key', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="e.g., PUID"
        />
      </div>
      <div className="form-section">
        <label htmlFor={`env-value-${itemData.id}`}>Value</label>
        <input
          id={`env-value-${itemData.id}`}
          type="text"
          value={value}
          onChange={(e) => handleChange('value', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="e.g., 1000"
        />
      </div>
    </div>
  );
};
