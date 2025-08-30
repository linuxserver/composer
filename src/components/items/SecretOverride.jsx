import React from 'react';
import '../../styles/Items.css';

export const itemDefinition = {
  name: 'Secret',
  defaultSize: { width: 14, height: 8 },
  inputs: [],
  outputs: [
    {
      id: 'secret_out',
      name: 'Secret',
      type: 'secret',
      multiple: true,
      color: '#ed64a6', // Pink
    },
  ],
};

export const ItemComponent = ({ itemData, onItemDataChange }) => {
  const secretName = itemData.data?.name || '';

  const handleChange = (field, value) => {
    onItemDataChange(itemData.id, { ...itemData.data, [field]: value });
  };

  return (
    <div className="item-form-container">
      <div className="form-section">
        <label htmlFor={`secret-name-${itemData.id}`}>Secret Name</label>
        <input
          id={`secret-name-${itemData.id}`}
          type="text"
          value={secretName}
          onChange={(e) => handleChange('name', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="e.g., db_password"
        />
      </div>
    </div>
  );
};
