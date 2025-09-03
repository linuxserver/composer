import React from 'react';
import '../../styles/Items.css';

export const itemDefinition = {
  name: 'Group Box',
  defaultSize: {
    width: 20,
    height: 15,
  },
  inputs: [],
  outputs: [],
};

export const ItemComponent = ({ itemData, onItemDataChange }) => {
  const notes = itemData.data?.notes ?? '';
  const handleChange = (e) => {
    onItemDataChange(itemData.id, { ...itemData.data, notes: e.target.value });
  };

  return (
    <textarea
      className="color-box-notes-area"
      value={notes}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      placeholder="Add notes..."
    />
  );
};
