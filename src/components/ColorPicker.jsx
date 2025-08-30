import React from 'react';
import '../styles/Workspace.css';

const ColorPicker = ({ onSelectColor, position }) => {
  const colors = [
    '#F44336', '#E91E63', '#9C27B0', '#673AB7',
    '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
    '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
    '#FFEB3B', '#FFC107', '#FF9800', '#FF5722',
    '#795548', '#9E9E9E', '#607D8B', '#4A5568',
  ];

  const handleColorClick = (e, color) => {
    e.stopPropagation();
    onSelectColor(color);
  };

  if (!position) return null;

  return (
    <div className="color-picker-container" style={{ top: position.y, left: position.x }}>
      {colors.map(color => (
        <div
          key={color}
          className="color-picker-swatch"
          style={{ backgroundColor: color }}
          onMouseDown={(e) => handleColorClick(e, color)}
        />
      ))}
    </div>
  );
};

export default ColorPicker;
