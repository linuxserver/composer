import React from 'react';
import '../../styles/Items.css';

export const itemDefinition = {
  name: 'Config',
  defaultSize: { width: 14, height: 8 },
  inputs: [],
  outputs: [
    {
      id: 'config_out',
      name: 'Config',
      type: 'config',
      multiple: true,
      color: '#d69e2e', // a brownish-yellow
    },
  ],
};

export const ItemComponent = ({ itemData, onItemDataChange }) => {
  const configName = itemData.data?.name || '';

  const handleChange = (field, value) => {
    onItemDataChange(itemData.id, { ...itemData.data, [field]: value });
  };

  return (
    <div className="item-form-container">
      <div className="form-section">
        <label htmlFor={`config-name-${itemData.id}`}>Config Name</label>
        <input
          id={`config-name-${itemData.id}`}
          type="text"
          value={configName}
          onChange={(e) => handleChange('name', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="e.g., app_config"
        />
      </div>
    </div>
  );
};
