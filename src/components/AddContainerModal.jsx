import React, { useState } from 'react';
import '../styles/Modal.css';

const AddContainerModal = ({ isOpen, onClose, onConfirm }) => {
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    if (name.trim()) {
      onConfirm({ name: name.trim(), iconUrl: iconUrl.trim() });
      setName('');
      setIconUrl('');
      onClose();
    } else {
      alert('Container name is required.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Custom Container</h2>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label htmlFor="container-name-input" style={{ display: 'block', marginBottom: '5px' }}>Container Name (Required)</label>
            <input
              id="container-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., my-custom-app"
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: '#4a5568', border: '1px solid #718096', borderRadius: '4px', color: 'white' }}
            />
          </div>
          <div>
            <label htmlFor="icon-url-input" style={{ display: 'block', marginBottom: '5px' }}>Icon URL (Optional)</label>
            <input
              id="icon-url-input"
              type="text"
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://example.com/icon.png"
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: '#4a5568', border: '1px solid #718096', borderRadius: '4px', color: 'white' }}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-button cancel" onMouseDown={onClose}>
            Cancel
          </button>
          <button className="modal-button confirm" onMouseDown={handleConfirm}>
            Add Container
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddContainerModal;
