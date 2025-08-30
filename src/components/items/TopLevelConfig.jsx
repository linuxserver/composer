import React from 'react';
import '../../styles/Items.css';

export const itemDefinition = {
  name: 'Top-level Config',
  defaultSize: { width: 20, height: 18 },
  inputs: [],
  outputs: [
    {
      id: 'config_out',
      name: 'Config',
      type: 'config',
      multiple: true,
      color: '#d69e2e', // Brownish-yellow
    },
  ],
};

export const ItemComponent = ({ itemData, onItemDataChange }) => {
  const data = itemData.data || {};
  const isExternal = data.external === true;
  const source = data.source || 'file';

  const handleChange = (field, value) => {
    const newData = { ...data, [field]: value };
    if (field === 'external' && value === true) {
      delete newData.source;
      delete newData.file;
      delete newData.environment;
      delete newData.content;
    }
    if (field === 'source') {
      delete newData.file;
      delete newData.environment;
      delete newData.content;
    }
    onItemDataChange(itemData.id, newData);
  };

  return (
    <div className="item-form-container scrollable">
      <div className="form-section">
        <label htmlFor={`configKey-${itemData.id}`}>Config Key</label>
        <input id={`configKey-${itemData.id}`} type="text" value={data.configKey || ''} onChange={(e) => handleChange('configKey', e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="e.g., http_config" />
      </div>

      <div className="form-section horizontal">
        <input id={`external-${itemData.id}`} type="checkbox" checked={!!data.external} onChange={(e) => handleChange('external', e.target.checked)} onClick={(e) => e.stopPropagation()} />
        <label htmlFor={`external-${itemData.id}`}>External</label>
      </div>
      
      <div className="form-section">
        <label htmlFor={`name-${itemData.id}`}>Custom Name</label>
        <input id={`name-${itemData.id}`} type="text" value={data.name || ''} onChange={(e) => handleChange('name', e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="Overrides config key as name" />
      </div>

      <div className="form-section">
        <label>Source</label>
        <select value={source} onChange={(e) => handleChange('source', e.target.value)} disabled={isExternal}>
          <option value="file">File</option>
          <option value="environment">Environment Variable</option>
          <option value="content">Inline Content</option>
        </select>
      </div>

      {source === 'file' && (
        <div className="form-section">
          <label htmlFor={`file-${itemData.id}`}>File Path</label>
          <input id={`file-${itemData.id}`} type="text" value={data.file || ''} onChange={(e) => handleChange('file', e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="./httpd.conf" disabled={isExternal} />
        </div>
      )}
      {source === 'environment' && (
        <div className="form-section">
          <label htmlFor={`environment-${itemData.id}`}>Environment Variable</label>
          <input id={`environment-${itemData.id}`} type="text" value={data.environment || ''} onChange={(e) => handleChange('environment', e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="HTTP_CONFIG_VAR" disabled={isExternal} />
        </div>
      )}
      {source === 'content' && (
        <div className="form-section">
          <label htmlFor={`content-${itemData.id}`}>Content</label>
          <textarea id={`content-${itemData.id}`} value={data.content || ''} onChange={(e) => handleChange('content', e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="key=value" disabled={isExternal} style={{minHeight: '60px'}}/>
        </div>
      )}
    </div>
  );
};
