import React from 'react';
import '../../styles/Items.css';

/**
 * The definition for the Device item.
 * Provides a string value to a container's devices array.
 */
export const itemDefinition = {
  name: 'Device',
  defaultSize: {
    width: 16,
    height: 8,
  },
  inputs: [],
  outputs: [
    {
      id: 'device_out',
      name: 'Device',
      type: 'mntpath', // Compatible with the container's device input
      multiple: true,
      color: '#667eea', // Indigo
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
        <label htmlFor={`device-value-${itemData.id}`}>Device (HOST:CONTAINER)</label>
        <input
          id={`device-value-${itemData.id}`}
          type="text"
          value={value}
          onChange={(e) => handleChange('value', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="e.g., /dev/dri:/dev/dri"
        />
      </div>
    </div>
  );
};
