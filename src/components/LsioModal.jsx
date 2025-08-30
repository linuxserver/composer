import React, { useState, useMemo } from 'react';
import '../styles/LsioModal.css';

const LsioModal = ({ isOpen, onClose, onDragStartItem, lsioApps }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredApps = useMemo(() => {
    if (!searchTerm) {
      return lsioApps;
    }
    return lsioApps.filter(app =>
      app.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [lsioApps, searchTerm]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="lsio-modal-panel" onMouseDown={(e) => e.stopPropagation()}>
      <div className="lsio-modal-header">
        <h3>LSIO Containers</h3>
        <span className="lsio-modal-close-btn" onMouseDown={onClose}>&times;</span>
        <input
          type="text"
          placeholder="Search apps..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="lsio-search-bar"
        />
      </div>
      <div className="lsio-grid">
        {filteredApps.map(app => (
          <div
            key={app.id}
            className="lsio-grid-item"
            draggable
            onDragStart={(e) => onDragStartItem(e, app)}
            title={`Drag to add ${app.name}`}
          >
            <img src={app.icon || '/docker-logo.svg'} alt={`${app.name} logo`} />
            <span>{app.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LsioModal;
