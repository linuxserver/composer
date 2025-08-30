import React from 'react';
import '../../styles/Items.css';

/**
 * The definition for the User Override item.
 * Provides a string value for a container's user property.
 */
export const itemDefinition = {
  name: 'User',
  defaultSize: {
    width: 14,
    height: 8,
  },
  inputs: [],
  outputs: [
    {
      id: 'user_out',
      name: 'User',
      type: 'env_value', // Compatible with generic property inputs
      multiple: true,
      color: '#9f7aea', // Purple
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
        <label htmlFor={`user-value-${itemData.id}`}>User</label>
        <input
          id={`user-value-${itemData.id}`}
          type="text"
          value={value}
          onChange={(e) => handleChange('value', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="e.g., 1000:1000"
        />
      </div>
    </div>
  );
};
