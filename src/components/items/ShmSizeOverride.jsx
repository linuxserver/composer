import React from 'react';
import '../../styles/Items.css';

/**
 * The definition for the SHM Size Override item.
 * Provides a string value for a container's shm_size property.
 */
export const itemDefinition = {
  name: 'SHM Size',
  defaultSize: {
    width: 14,
    height: 8,
  },
  inputs: [],
  outputs: [
    {
      id: 'shm_size_out',
      name: 'Size',
      type: 'env_value', // Compatible with generic property inputs
      multiple: true,
      color: '#38b2ac', // Teal
    },
  ],
};

/**
 * The component rendered in the item's body.
 */
export const ItemComponent = ({ itemData, onItemDataChange }) => {
  const value = itemData.data?.value ?? '';

  const handleChange = (field, fieldValue) => {
    onItemDataChange(itemData.id, { ...itemData.data, [field]: fieldValue });
  };

  return (
    <div className="item-form-container">
      <div className="form-section">
        <label htmlFor={`shm-size-value-${itemData.id}`}>SHM Size</label>
        <input
          id={`shm-size-value-${itemData.id}`}
          type="text"
          value={value}
          onChange={(e) => handleChange('value', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="e.g., 1g or 256m"
        />
      </div>
    </div>
  );
};
