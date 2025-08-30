import React from 'react';
import '../../styles/Items.css';

// --- Helper Components (similar to Container.jsx for consistency) ---

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

const IpamConfigEditor = ({ items, onChange, disabled = false }) => {
    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        onChange(newItems);
    };

    const handleAddItem = (e) => {
        e.stopPropagation();
        onChange([...items, { subnet: '', ip_range: '', gateway: '', aux_addresses: [] }]);
    };

    const handleRemoveItem = (e, index) => {
        e.stopPropagation();
        onChange(items.filter((_, i) => i !== index));
    };

    return (
        <div className="form-section" style={{ border: '1px solid #2d3748', borderRadius: '4px', padding: '8px' }}>
            <label>IPAM Config</label>
            {items.map((item, index) => (
                <div key={index} className="form-section" style={{ borderTop: '1px solid #2d3748', paddingTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Config Block #{index + 1}</span>
                        <button onMouseDown={(e) => handleRemoveItem(e, index)} className="remove-btn" disabled={disabled}>-</button>
                    </div>
                    <input type="text" placeholder="Subnet (e.g., 172.28.0.0/16)" value={item.subnet || ''} onChange={(e) => handleItemChange(index, 'subnet', e.target.value)} onClick={(e) => e.stopPropagation()} disabled={disabled} />
                    <input type="text" placeholder="IP Range (e.g., 172.28.5.0/24)" value={item.ip_range || ''} onChange={(e) => handleItemChange(index, 'ip_range', e.target.value)} onClick={(e) => e.stopPropagation()} disabled={disabled} />
                    <input type="text" placeholder="Gateway (e.g., 172.28.5.254)" value={item.gateway || ''} onChange={(e) => handleItemChange(index, 'gateway', e.target.value)} onClick={(e) => e.stopPropagation()} disabled={disabled} />
                    <KeyValueListEditor title="Auxiliary Addresses" items={item.aux_addresses || []} onChange={(newList) => handleItemChange(index, 'aux_addresses', newList)} keyName="hostname" valueName="ip" disabled={disabled} />
                </div>
            ))}
            <button onMouseDown={handleAddItem} className="add-btn" disabled={disabled}>+ Add Config Block</button>
        </div>
    );
};


// --- Item Definition ---

export const itemDefinition = {
  name: 'Top-level Network',
  defaultSize: { width: 24, height: 20 },
  inputs: [],
  outputs: [
    {
      id: 'network_out',
      name: 'Network',
      type: 'network',
      multiple: true,
      color: '#48bb78', // Green
    },
  ],
};

// --- Item Component ---

export const ItemComponent = ({ itemData, onItemDataChange }) => {
  const data = itemData.data || {};
  const ipam = data.ipam || {};
  const isExternal = data.external === true;

  const handleChange = (field, value) => {
    onItemDataChange(itemData.id, { ...data, [field]: value });
  };
  
  const handleIpamChange = (field, value) => {
    onItemDataChange(itemData.id, {
      ...data,
      ipam: { ...ipam, [field]: value }
    });
  };

  const ensureArrayFormat = (list) => {
    if (!list) return [];
    if (Array.isArray(list)) return list;
    return Object.entries(list).map(([key, value]) => ({ key, value }));
  };

  return (
    <div className="item-form-container scrollable">
      <div className="form-section">
        <label htmlFor={`networkName-${itemData.id}`}>Network Key</label>
        <input id={`networkName-${itemData.id}`} type="text" value={data.networkName || ''} onChange={(e) => handleChange('networkName', e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="e.g., my_frontend_net" />
        <small style={{ opacity: 0.7, fontSize: '0.8em' }}>The key used in the compose file and for linking.</small>
      </div>

      <div className="form-section horizontal">
        <input id={`external-${itemData.id}`} type="checkbox" checked={!!data.external} onChange={(e) => handleChange('external', e.target.checked)} onClick={(e) => e.stopPropagation()} />
        <label htmlFor={`external-${itemData.id}`}>External</label>
      </div>
      
      <div className="form-section">
        <label htmlFor={`name-${itemData.id}`}>Custom Name</label>
        <input id={`name-${itemData.id}`} type="text" value={data.name || ''} onChange={(e) => handleChange('name', e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="Overrides network key as name" />
      </div>

      <div className="form-section">
        <label htmlFor={`driver-${itemData.id}`}>Driver</label>
        <input id={`driver-${itemData.id}`} type="text" value={data.driver || ''} onChange={(e) => handleChange('driver', e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="e.g., bridge, overlay" disabled={isExternal} />
      </div>

      <div className="form-section horizontal">
        <input id={`attachable-${itemData.id}`} type="checkbox" checked={!!data.attachable} onChange={(e) => handleChange('attachable', e.target.checked)} onClick={(e) => e.stopPropagation()} disabled={isExternal} />
        <label htmlFor={`attachable-${itemData.id}`}>Attachable</label>
        <input id={`internal-${itemData.id}`} type="checkbox" checked={!!data.internal} onChange={(e) => handleChange('internal', e.target.checked)} onClick={(e) => e.stopPropagation()} disabled={isExternal} />
        <label htmlFor={`internal-${itemData.id}`}>Internal</label>
        <input id={`enable_ipv6-${itemData.id}`} type="checkbox" checked={!!data.enable_ipv6} onChange={(e) => handleChange('enable_ipv6', e.target.checked)} onClick={(e) => e.stopPropagation()} disabled={isExternal} />
        <label htmlFor={`enable_ipv6-${itemData.id}`}>Enable IPv6</label>
      </div>

      <KeyValueListEditor title="Driver Options" items={ensureArrayFormat(data.driver_opts)} onChange={(newList) => handleChange('driver_opts', newList)} disabled={isExternal} />
      <KeyValueListEditor title="Labels" items={ensureArrayFormat(data.labels)} onChange={(newList) => handleChange('labels', newList)} disabled={isExternal} />

      {/* --- IPAM Section --- */}
      <div className="form-section" style={{ border: '1px solid #4a5568', borderRadius: '4px', padding: '8px' }}>
        <label style={{ fontWeight: 'bold' }}>IPAM Configuration</label>
        <div className="form-section">
            <label htmlFor={`ipam-driver-${itemData.id}`}>IPAM Driver</label>
            <input id={`ipam-driver-${itemData.id}`} type="text" value={ipam.driver || ''} onChange={(e) => handleIpamChange('driver', e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="e.g., default" disabled={isExternal} />
        </div>
        <IpamConfigEditor items={ipam.config || []} onChange={(newList) => handleIpamChange('config', newList)} disabled={isExternal} />
        <KeyValueListEditor title="IPAM Options" items={ensureArrayFormat(ipam.options)} onChange={(newList) => handleIpamChange('options', newList)} disabled={isExternal} />
      </div>

    </div>
  );
};
