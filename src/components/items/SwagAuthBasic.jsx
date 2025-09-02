import React from 'react';
import '../../styles/Items.css';

export const itemDefinition = {
  name: 'Basic',
  defaultSize: {
    width: 14,
    height: 10,
  },
  inputs: [],
  outputs: [
    {
      id: 'swag_auth_out',
      name: 'Basic Auth',
      type: 'swag_auth',
      multiple: true,
      color: '#4299e1', // Blue
    },
  ],
};

export const ItemComponent = ({ itemData, onItemDataChange }) => {
  const user = itemData.data?.user ?? 'username';
  const pass = itemData.data?.pass ?? 'changeme';

  const handleChange = (field, value) => {
    onItemDataChange(itemData.id, { ...itemData.data, [field]: value });
  };

  return (
    <div className="item-form-container">
      <div className="form-section">
        <label htmlFor={`auth-user-${itemData.id}`}>User</label>
        <input
          id={`auth-user-${itemData.id}`}
          type="text"
          value={user}
          onChange={(e) => handleChange('user', e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="form-section">
        <label htmlFor={`auth-pass-${itemData.id}`}>Password</label>
        <input
          id={`auth-pass-${itemData.id}`}
          type="text"
          value={pass}
          onChange={(e) => handleChange('pass', e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
};
