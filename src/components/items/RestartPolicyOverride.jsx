import React from 'react';
import '../../styles/Items.css';

/**
 * The definition for the Restart Policy Override item.
 * Provides a string value for a container's restart property.
 */
export const itemDefinition = {
  name: 'Restart Policy',
  defaultSize: {
    width: 14,
    height: 8,
  },
  inputs: [],
  outputs: [
    {
      id: 'restart_policy_out',
      name: 'Policy',
      type: 'env_value', // Compatible with generic property inputs
      multiple: true,
      color: '#4299e1', // Blue
    },
  ],
};

/**
 * The component rendered in the item's body.
 */
export const ItemComponent = ({ itemData, onItemDataChange }) => {
  const value = itemData.data?.value ?? 'no';

  const handleChange = (field, fieldValue) => {
    onItemDataChange(itemData.id, { ...itemData.data, [field]: fieldValue });
  };

  return (
    <div className="item-form-container">
      <div className="form-section">
        <label htmlFor={`restart-policy-value-${itemData.id}`}>Policy</label>
        <select
          id={`restart-policy-value-${itemData.id}`}
          value={value}
          onChange={(e) => handleChange('value', e.target.value)}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="no">No</option>
          <option value="always">Always</option>
          <option value="on-failure">On Failure</option>
          <option value="unless-stopped">Unless Stopped</option>
        </select>
      </div>
    </div>
  );
};
