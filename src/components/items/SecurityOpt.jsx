import React from 'react';
import '../../styles/Items.css';

/**
 * The definition for the Security Option item.
 * Provides a string value to a container's security_opt array.
 */
export const itemDefinition = {
  name: 'Security Option',
  defaultSize: {
    width: 16,
    height: 8,
  },
  inputs: [],
  outputs: [
    {
      id: 'security_opt_out',
      name: 'Option',
      type: 'string_value', // Custom type for this purpose
      multiple: true,
      color: '#718096', // Slate
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
        <label htmlFor={`security-opt-value-${itemData.id}`}>Security Option</label>
        <input
          id={`security-opt-value-${itemData.id}`}
          type="text"
          value={value}
          onChange={(e) => handleChange('value', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="e.g., no-new-privileges:true"
        />
      </div>
    </div>
  );
};
