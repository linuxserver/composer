import React, { useState } from 'react';
import '../styles/Modal.css';

const ComposeModal = ({ isOpen, onClose, composeFileContent }) => {
  const [copyButtonText, setCopyButtonText] = useState('Copy');

  if (!isOpen) {
    return null;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(composeFileContent).then(() => {
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Copy'), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      setCopyButtonText('Error!');
      setTimeout(() => setCopyButtonText('Copy'), 2000);
    });
  };

  const handleDownload = () => {
    const blob = new Blob([composeFileContent], { type: 'text/yaml;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'docker-compose.yml');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-content large" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-container">
            <img src="/docker-logo.svg" className="modal-header-icon" alt="Docker Logo" />
            <h2>Docker Compose File</h2>
          </div>
          <span className="modal-close" onMouseDown={onClose}>&times;</span>
        </div>
        <div className="modal-body">
          <pre className="compose-content">
            <code>{composeFileContent}</code>
          </pre>
        </div>
        <div className="modal-footer">
          <button className="modal-button" onMouseDown={handleDownload}>
            Download file
          </button>
          <button className="modal-button confirm" onMouseDown={handleCopy}>
            {copyButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComposeModal;
