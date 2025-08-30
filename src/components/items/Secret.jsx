import React from 'react';
import '../../styles/Items.css';

export const itemDefinition = {
  name: 'Top-level Secret',
  defaultSize: { width: 20, height: 16 },
  inputs: [],
  outputs: [
    {
      id: 'secret_out',
      name: 'Secret',
      type: 'secret',
      multiple: true,
      color: '#ed64a6', // Pink
    },
  ],
};

export const ItemComponent = ({ itemData, onItemDataChange }) => {
  const data = itemData.data || {};
  const isExternal = data.external === true;
  const source = data.source || 'file';

  const handleChange = (field, value) => {
    const newData = { ...data, [field]: value };
    // If external is checked, clear other source-related fields.
    if (field === 'external' && value === true) {
      delete newData.source;
      delete newData.file;
      delete newData.environment;
    }
    // If source is changed, clear the old source's value.
    if (field === 'source') {
        delete newData.file;
        delete newData.environment;
    }
    onItemDataChange(itemData.id, newData);
  };

  return (
    <div className="item-form-container scrollable">
      <div className="form-section">
        <label htmlFor={`secretKey-${itemData.id}`}>Secret Key</label>
        <input
          id={`secretKey-${itemData.id}`}
          type="text"
          value={data.secretKey || ''}
          onChange={(e) => handleChange('secretKey', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="e.g., db_password"
        />
      </div>

      <div className="form-section horizontal">
        <input 
          id={`external-${itemData.id}`} 
          type="checkbox" 
          checked={!!data.external} 
          onChange={(e) => handleChange('external', e.target.checked)} 
          onClick={(e) => e.stopPropagation()} 
        />
        <label htmlFor={`external-${itemData.id}`}>External</label>
      </div>

      <div className="form-section">
        <label htmlFor={`name-${itemData.id}`}>Custom Name</label>
        <input
          id={`name-${itemData.id}`}
          type="text"
          value={data.name || ''}
          onChange={(e) => handleChange('name', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="Overrides secret key as name"
        />
      </div>

      <div className="form-section">
        <label>Source</label>
        <select value={source} onChange={(e) => handleChange('source', e.target.value)} disabled={isExternal}>
          <option value="file">File</option>
          <option value="environment">Environment Variable</option>
        </select>
      </div>

      {source === 'file' && (
        <div className="form-section">
          <label htmlFor={`file-${itemData.id}`}>File Path</label>
          <input
            id={`file-${itemData.id}`}
            type="text"
            value={data.file || ''}
            onChange={(e) => handleChange('file', e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="./secrets/db_pass.txt"
            disabled={isExternal}
          />
        </div>
      )}
      {source === 'environment' && (
        <div className="form-section">
          <label htmlFor={`environment-${itemData.id}`}>Environment Variable</label>
          <input
            id={`environment-${itemData.id}`}
            type="text"
            value={data.environment || ''}
            onChange={(e) => handleChange('environment', e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="DB_PASSWORD_VAR"
            disabled={isExternal}
          />
        </div>
      )}
    </div>
  );
};
