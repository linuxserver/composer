import React from 'react';
import '../../styles/Items.css';

const KeyValueListEditor = ({ title, items, onChange, keyName = 'key', valueName = 'value', disabled = false }) => {
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const handleAddItem = (e) => {
    e.stopPropagation();
    onChange([...items, { [keyName]: '', [valueName]: '' }]);
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
            placeholder={keyName}
            value={item[keyName] || ''}
            onChange={(e) => handleItemChange(index, keyName, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            disabled={disabled}
          />
          <input
            type="text"
            placeholder={valueName}
            value={item[valueName] || ''}
            onChange={(e) => handleItemChange(index, valueName, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            disabled={disabled}
          />
          <button onMouseDown={(e) => handleRemoveItem(e, index)} className="remove-btn" disabled={disabled}>-</button>
        </div>
      ))}
      <button onMouseDown={handleAddItem} className="add-btn" disabled={disabled}>+ Add</button>
    </div>
  );
};

export const itemDefinition = {
  name: 'Top-level Volume',
  defaultSize: { width: 20, height: 18 },
  inputs: [],
  outputs: [
    {
      id: 'volume_out',
      name: 'Volume',
      type: 'volume',
      multiple: true,
      color: '#ecc94b', // Amber
    },
  ],
};

export const ItemComponent = ({ itemData, onItemDataChange }) => {
  const data = itemData.data || {};
  const isExternal = data.external === true;

  const handleChange = (field, value) => {
    const newData = { ...data, [field]: value };
    if (field === 'external' && value === true) {
      delete newData.driver;
      delete newData.driver_opts;
      delete newData.labels;
    }
    onItemDataChange(itemData.id, newData);
  };
  
  const ensureArrayFormat = (list) => {
    if (!list) return [];
    if (Array.isArray(list)) return list;
    return Object.entries(list).map(([key, value]) => ({ key, value }));
  };

  return (
    <div className="item-form-container scrollable">
      <div className="form-section">
        <label htmlFor={`volumeKey-${itemData.id}`}>Volume Key</label>
        <input id={`volumeKey-${itemData.id}`} type="text" value={data.volumeKey || ''} onChange={(e) => handleChange('volumeKey', e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="e.g., db-data" />
      </div>

      <div className="form-section horizontal">
        <input id={`external-${itemData.id}`} type="checkbox" checked={!!data.external} onChange={(e) => handleChange('external', e.target.checked)} onClick={(e) => e.stopPropagation()} />
        <label htmlFor={`external-${itemData.id}`}>External</label>
      </div>
      
      <div className="form-section">
        <label htmlFor={`name-${itemData.id}`}>Custom Name</label>
        <input id={`name-${itemData.id}`} type="text" value={data.name || ''} onChange={(e) => handleChange('name', e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="Overrides volume key as name" />
      </div>

      <div className="form-section">
        <label htmlFor={`driver-${itemData.id}`}>Driver</label>
        <input id={`driver-${itemData.id}`} type="text" value={data.driver || ''} onChange={(e) => handleChange('driver', e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="e.g., local" disabled={isExternal} />
      </div>
      
      <KeyValueListEditor title="Driver Options" items={ensureArrayFormat(data.driver_opts)} onChange={(newList) => handleChange('driver_opts', newList)} disabled={isExternal} />
      <KeyValueListEditor title="Labels" items={ensureArrayFormat(data.labels)} onChange={(newList) => handleChange('labels', newList)} disabled={isExternal} />

    </div>
  );
};
