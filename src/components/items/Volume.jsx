import React from 'react';
import '../../styles/Items.css';

export const itemDefinition = {
  name: 'Volume',
  defaultSize: { width: 14, height: 8 },
  inputs: [],
  outputs: [
    {
      id: 'volume_out',
      name: 'Volume',
      type: 'volume', // This type is now distinct from 'mntpath'
      multiple: true,
      color: '#ecc94b', // Amber
    },
  ],
};

export const ItemComponent = ({ itemData, onItemDataChange }) => {
  const volumeName = itemData.data?.name || '';

  const handleChange = (field, value) => {
    onItemDataChange(itemData.id, { ...itemData.data, [field]: value });
  };

  return (
    <div className="item-form-container">
      <div className="form-section">
        <label htmlFor={`volume-name-${itemData.id}`}>Volume Name</label>
        <input
          id={`volume-name-${itemData.id}`}
          type="text"
          value={volumeName}
          onChange={(e) => handleChange('name', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="e.g., db_data"
        />
      </div>
    </div>
  );
};
