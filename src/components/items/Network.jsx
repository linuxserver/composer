import React from 'react';
import '../../styles/Items.css';

export const itemDefinition = {
  name: 'Network',
  defaultSize: { width: 14, height: 8 },
  inputs: [],
  outputs: [
    {
      id: 'network_out',
      name: 'Network',
      type: 'network',
      multiple: true,
      color: '#48bb78', // Green
    },
  ],
};

export const ItemComponent = ({ itemData, onItemDataChange }) => {
  const networkName = itemData.data?.name || '';

  const handleChange = (field, value) => {
    onItemDataChange(itemData.id, { ...itemData.data, [field]: value });
  };

  return (
    <div className="item-form-container">
      <div className="form-section">
        <label htmlFor={`network-name-${itemData.id}`}>Network Name</label>
        <input
          id={`network-name-${itemData.id}`}
          type="text"
          value={networkName}
          onChange={(e) => handleChange('name', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="e.g., my_backend_net"
        />
      </div>
    </div>
  );
};
