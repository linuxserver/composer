import React from 'react';
import '../../styles/Items.css';

/**
 * The definition for the Default Bridge item.
 * It accepts multiple 'portmap' connections.
 */
export const itemDefinition = {
  name: 'Default Bridge',
  defaultSize: {
    width: 16,
    height: 12,
  },
  inputs: [
    {
      id: 'ports',
      name: 'Ports',
      compatibleTypes: ['portmap'],
      multiple: true,
      color: '#f56565', // Red
    },
  ],
  outputs: [],
  // All onConnection/onDisconnection logic has been removed
  // and is now handled in App.jsx
};

/**
 * The component rendered in the item's body.
 * It displays a form for all connected ports and validates for duplicates.
 */
export const ItemComponent = ({ itemData, onItemDataChange }) => {
  const ports = itemData.data?.ports || [];

  // --- Validation Logic ---
  // 1. Count occurrences of each mapped port number.
  const portCounts = ports.reduce((acc, port) => {
    const portNum = port.mappedPort;
    if (portNum) { // Only count valid numbers
      acc[portNum] = (acc[portNum] || 0) + 1;
    }
    return acc;
  }, {});

  // 2. Create a set of port numbers that are duplicates.
  const duplicatePorts = new Set();
  for (const portNum in portCounts) {
    if (portCounts[portNum] > 1) {
      duplicatePorts.add(parseInt(portNum, 10));
    }
  }
  // --- End Validation Logic ---

  // Handles changes to any port input field.
  const handlePortChange = (connectionId, newValue) => {
    // Create a new array with the updated port value, ensuring immutability.
    const newPorts = ports.map(port => 
      port.connectionId === connectionId 
        ? { ...port, mappedPort: newValue === '' ? '' : parseInt(newValue, 10) }
        : port
    );
    // Call the central state update function from App.jsx.
    onItemDataChange(itemData.id, { ports: newPorts });
  };

  return (
    <div className="item-form-container">
      {ports.length > 0 ? (
        ports.map(port => {
          const isDuplicate = duplicatePorts.has(port.mappedPort);
          const inputStyle = {
            width: '60px',
            backgroundColor: '#2d3748',
            color: 'white',
            border: `1px solid ${isDuplicate ? '#e53e3e' : '#4a5568'}`, // Red border if duplicate
            borderRadius: '4px',
            padding: '4px',
            textAlign: 'right',
          };

          return (
            <div key={`${port.connectionId}-${port.name}`} className="form-row">
              <label htmlFor={`port-${port.connectionId}-${port.name}`}>
                {port.name}:
              </label>
              <input
                id={`port-${port.connectionId}-${port.name}`}
                type="number"
                value={port.mappedPort}
                onChange={(e) => handlePortChange(port.connectionId, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={inputStyle}
              />
            </div>
          );
        })
      ) : (
        <p style={{ fontSize: '0.9em', margin: 'auto', opacity: 0.7 }}>Not connected</p>
      )}
    </div>
  );
};
