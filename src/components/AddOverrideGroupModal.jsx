import React, { useState } from 'react';
import '../styles/Modal.css';
import '../styles/Items.css'; // For list editor styles

const StringListEditor = ({ title, items, onChange, placeholder }) => {
    const handleItemChange = (index, value) => {
      const newItems = [...items];
      newItems[index] = value;
      onChange(newItems);
    };

    const handleBlur = (index, value) => {
        const trimmedValue = value.trim();
        if(trimmedValue === '') {
            onChange(items.filter((_, i) => i !== index));
        } else {
            const newItems = [...items];
            newItems[index] = trimmedValue;
            onChange(newItems);
        }
    }
  
    const handleAddItem = (e) => {
      e.stopPropagation();
      onChange([...items, '']);
    };
  
    const handleRemoveItem = (e, index) => {
      e.stopPropagation();
      onChange(items.filter((_, i) => i !== index));
    };
  
    return (
      <div className="form-section">
        <label>{title}</label>
        {items.map((item, index) => (
            <div key={index} className="list-item-editor">
              <input
                type="text"
                placeholder={placeholder}
                value={item}
                onChange={(e) => handleItemChange(index, e.target.value)}
                onBlur={(e) => handleBlur(index, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 'calc(100% - 30px)' }}
              />
              <button onMouseDown={(e) => handleRemoveItem(e, index)} className="remove-btn">-</button>
            </div>
        ))}
        <button onMouseDown={handleAddItem} className="add-btn">+ Add</button>
      </div>
    );
};

const CheckboxGrid = ({ title, options, selectedOptions, onChange }) => {
    const handleToggle = (option) => {
        const newSelection = new Set(selectedOptions);
        if (newSelection.has(option)) {
            newSelection.delete(option);
        } else {
            newSelection.add(option);
        }
        onChange(Array.from(newSelection));
    };

    return (
        <div className="form-section">
            <label>{title}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px', marginTop: '4px' }}>
                {options.map(option => (
                    <div key={option} className="form-section horizontal" style={{ gap: '4px' }}>
                        <input
                            id={`cb-${option}`}
                            type="checkbox"
                            checked={selectedOptions.includes(option)}
                            onChange={() => handleToggle(option)}
                        />
                        <label htmlFor={`cb-${option}`} style={{fontWeight: 'normal', opacity: 1}}>{option}</label>
                    </div>
                ))}
            </div>
        </div>
    );
};


const AddOverrideGroupModal = ({ isOpen, onClose, onConfirm }) => {
  const [groupName, setGroupName] = useState('New Override Group');
  const [envVars, setEnvVars] = useState(['PUID', 'PGID', 'TZ']);
  const [volumes, setVolumes] = useState(['/config']);
  const [enabledInputs, setEnabledInputs] = useState([]);
  const [enabledOutputs, setEnabledOutputs] = useState([]);

  const inputOptions = ["Depends On", "Labels", "Networks", "Secrets", "Configs", "Devices", "Security Opts", "Restart", "User", "SHM Size"];
  const outputOptions = ["Service", "Ports"];

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    if (groupName.trim()) {
      onConfirm({ 
          name: groupName.trim(), 
          envVars: [...new Set(envVars.map(v => v.trim()).filter(Boolean))],
          volumes: [...new Set(volumes.map(v => v.trim()).filter(Boolean))],
          enabledInputs,
          enabledOutputs,
      });
      // Reset for next time
      setGroupName('New Override Group');
      setEnvVars(['PUID', 'PGID', 'TZ']);
      setVolumes(['/config']);
      setEnabledInputs([]);
      setEnabledOutputs([]);
      onClose();
    } else {
      alert('Group name is required.');
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Override Group</h2>
        </div>
        <div className="modal-body scrollable" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '70vh' }}>
          <div className="form-section">
            <label htmlFor="group-name-input">Group Name</label>
            <input
              id="group-name-input"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: '#4a5568', border: '1px solid #718096', borderRadius: '4px', color: 'white' }}
            />
          </div>
          <StringListEditor 
            title="Custom Environment Variables"
            items={envVars}
            onChange={setEnvVars}
            placeholder="e.g., PUID"
          />
          <StringListEditor 
            title="Custom Volume Mounts"
            items={volumes}
            onChange={setVolumes}
            placeholder="e.g., /config"
          />
          <CheckboxGrid title="Enable Inputs" options={inputOptions} selectedOptions={enabledInputs} onChange={setEnabledInputs} />
          <CheckboxGrid title="Enable Outputs" options={outputOptions} selectedOptions={enabledOutputs} onChange={setEnabledOutputs} />
        </div>
        <div className="modal-footer">
          <button className="modal-button cancel" onMouseDown={onClose}>
            Cancel
          </button>
          <button className="modal-button confirm" onMouseDown={handleConfirm}>
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddOverrideGroupModal;
