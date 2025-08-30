import React from 'react';
import '../../styles/Items.css';

/**
 * The definition for the Label Override item.
 * Provides a key-value pair to a container's labels.
 */
export const itemDefinition = {
  name: 'Label',
  defaultSize: {
    width: 14,
    height: 10,
  },
  inputs: [],
  outputs: [
    {
      id: 'label_out',
      name: 'Label',
      type: 'label',
      multiple: true,
      color: '#a0aec0', // Gray
    },
  ],
};

/**
 * The component rendered in the item's body.
 * It contains fields for a label's key and value.
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
        <label htmlFor={`label-key-${itemData.id}`}>Key</label>
        <input
          id={`label-key-${itemData.id}`}
          type="text"
          value={key}
          onChange={(e) => handleChange('key', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="e.g., com.example.foo"
        />
      </div>
      <div className="form-section">
        <label htmlFor={`label-value-${itemData.id}`}>Value</label>
        <input
          id={`label-value-${itemData.id}`}
          type="text"
          value={value}
          onChange={(e) => handleChange('value', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="e.g., bar"
        />
      </div>
    </div>
  );
};
