import React, { useState } from 'react';
import '../styles/Items.css';

export const getDynamicDefinition = (item, staticDefinition) => {
    if (!item.data || !staticDefinition) {
        return staticDefinition;
    }

    if (item.type === 'EnvVarOverride') {
        const key = item.data.key;
        if (key) {
            return {
                ...staticDefinition,
                outputs: [{ id: `env_out:${key}`, name: key, type: 'env_value', multiple: true, color: '#f6ad55' }]
            };
        }
        return { ...staticDefinition, outputs: [{ id: 'env_out_placeholder', name: 'Set Key', type: 'env_value', color: '#a0aec0' }] };
    }
    
    if (item.type === 'OverrideGroup') {
        const dynamicInputs = [];
        const dynamicOutputs = [];
        const data = item.data || {};
        const enabledInputs = data.enabledInputs || [];
        const enabledOutputs = data.enabledOutputs || [];

        (data.envVars || []).forEach(key => {
            dynamicInputs.push({ id: `in:env:${key}`, name: key, compatibleTypes: ['mntpath', 'env_value'], multiple: false, color: '#f6ad55' });
        });
        (data.volumes || []).forEach(path => {
            dynamicInputs.push({ id: `in:volume:${path}`, name: `vol: ${path.length > 12 ? `...${path.slice(-9)}` : path}`, compatibleTypes: ['mntpath'], multiple: false, color: '#ecc94b' });
        });

        // Conditionally add standard inputs based on checkboxes
        if (enabledInputs.includes('Depends On')) dynamicInputs.push({ id: 'in:depends_on', name: 'Depends On', compatibleTypes: ['service'], multiple: true, color: '#63b3ed' });
        if (enabledInputs.includes('Labels')) dynamicInputs.push({ id: 'in:labels', name: 'Labels', compatibleTypes: ['label'], multiple: true, color: '#a0aec0' });
        if (enabledInputs.includes('Networks')) dynamicInputs.push({ id: 'in:networks', name: 'Networks', compatibleTypes: ['network'], multiple: true, color: '#48bb78' });
        if (enabledInputs.includes('Secrets')) dynamicInputs.push({ id: 'in:secrets', name: 'Secrets', compatibleTypes: ['secret'], multiple: true, color: '#ed64a6' });
        if (enabledInputs.includes('Configs')) dynamicInputs.push({ id: 'in:configs', name: 'Configs', compatibleTypes: ['config'], multiple: true, color: '#d69e2e' });
        if (enabledInputs.includes('Devices')) dynamicInputs.push({ id: 'in:devices', name: 'Devices', compatibleTypes: ['mntpath'], multiple: true, color: '#667eea' });
        if (enabledInputs.includes('Security Opts')) dynamicInputs.push({ id: 'in:security_opt', name: 'Security Opts', compatibleTypes: ['string_value'], multiple: true, color: '#718096' });
        if (enabledInputs.includes('Restart')) dynamicInputs.push({ id: 'in:prop:restart', name: 'Restart', compatibleTypes: ['env_value'], multiple: false, color: '#4299e1' });
        if (enabledInputs.includes('User')) dynamicInputs.push({ id: 'in:prop:user', name: 'User', compatibleTypes: ['env_value'], multiple: false, color: '#9f7aea' });
        if (enabledInputs.includes('SHM Size')) dynamicInputs.push({ id: 'in:prop:shm_size', name: 'SHM Size', compatibleTypes: ['env_value'], multiple: false, color: '#38b2ac' });

        // Conditionally add outputs
        if (enabledOutputs.includes('Service')) dynamicOutputs.push({ id: 'out:service', name: 'Service', type: 'service', multiple: true, color: '#63b3ed' });
        if (enabledOutputs.includes('Ports')) dynamicOutputs.push({ id: 'out:portmap', name: 'Ports', type: 'portmap', multiple: true, color: '#f56565' });


        return { ...staticDefinition, name: data.name || 'Override Group', inputs: dynamicInputs, outputs: dynamicOutputs };
    }

    const isContainer = staticDefinition.inputs.some(i => i.id === 'depends_on');
    const isSwag = item.type === 'DuckdnsSwag';

    if (!isContainer && !isSwag) {
        return staticDefinition;
    }

    const serviceData = item.data;
    const dynamicInputs = [];
    const allowedEnvs = isSwag ? ['PUID', 'PGID', 'TZ'] : null;
    const allowedVols = isSwag ? ['/config'] : null;

    (serviceData.volumes || []).forEach((volumeString) => {
        const parts = volumeString.split(':');
        const target = parts.length > 1 ? parts[1] : '';
        if (target && (!allowedVols || allowedVols.includes(target))) {
            dynamicInputs.push({
                id: `volume:${target}`,
                name: `vol: ${target.length > 12 ? `...${target.slice(-9)}` : target}`,
                compatibleTypes: ['mntpath', 'volume'],
                multiple: false,
                color: '#ecc94b',
            });
        }
    });

    if (Array.isArray(serviceData.environment)) {
        serviceData.environment.forEach((env) => {
            if (env.key && (!allowedEnvs || allowedEnvs.includes(env.key))) {
                dynamicInputs.push({ id: `env:${env.key}`, name: env.key, compatibleTypes: ['mntpath', 'env_value'], multiple: false, color: '#f6ad55' });
            }
        });
    }

    const combinedInputs = [...staticDefinition.inputs];
    const staticInputIds = new Set(staticDefinition.inputs.map(i => i.id));
    dynamicInputs.forEach(dInput => {
      if (!staticInputIds.has(dInput.id)) {
        combinedInputs.push(dInput);
      }
    });

    const finalDefinition = { ...staticDefinition, inputs: combinedInputs };
    if (item.data?.network_mode === 'host') {
        finalDefinition.outputs = finalDefinition.outputs.map(o => {
            if (o.id === 'portmap') {
                return { ...o, name: 'Host', disabled: true };
            }
            return o;
        });
    }

    return finalDefinition;
};


const renderConnectors = (item, definition, onStartLinking, onEndLinking) => {
  const handleStart = (e, connectorId) => {
    e.stopPropagation();
    onStartLinking(item.id, connectorId);
  };

  const handleEnd = (e, connectorId) => {
    e.stopPropagation();
    onEndLinking(item.id, connectorId);
  };

  const renderConnectorSet = (connectors, setType) => (
    <div className={`connectors-column ${setType}`}>
      {connectors.map((connector) => (
        <div key={connector.id} className="connector-wrapper">
          <div
            className="connector"
            data-itemid={item.id}
            data-connectorid={connector.id}
            id={`${item.id}-${connector.id}`}
            style={{ 
              backgroundColor: connector.color || '#9f7aea',
              cursor: connector.disabled ? 'not-allowed' : 'crosshair'
            }}
            onMouseDown={!connector.disabled && setType === 'outputs' ? (e) => handleStart(e, connector.id) : null}
            onTouchStart={!connector.disabled && setType === 'outputs' ? (e) => handleStart(e, connector.id) : null}
            onMouseUp={!connector.disabled && setType === 'inputs' ? (e) => handleEnd(e, connector.id) : null}
            onTouchEnd={!connector.disabled && setType === 'inputs' ? (e) => handleEnd(e, connector.id) : null}
          />
          <span className="connector-label">{connector.name}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="item-connectors-bar">
      {renderConnectorSet(definition.inputs, 'inputs')}
      <div className="connectors-spacer">
        {definition.icon && <img src={definition.icon} alt={`${definition.name} icon`} className="item-icon" />}
      </div>
      {renderConnectorSet(definition.outputs, 'outputs')}
    </div>
  );
};

const EditableLabel = ({ item, onItemDataChange }) => {
    const [isEditing, setIsEditing] = useState(false);
    const label = item.data?.label ?? 'New Group';

    const handleLabelChange = (e) => {
        onItemDataChange(item.id, { ...item.data, label: e.target.value });
    };

    const handleDoubleClick = (e) => {
        e.stopPropagation();
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            setIsEditing(false);
            e.target.blur();
        }
    };

    if (isEditing) {
        return (
            <input
                type="text"
                value={label}
                onChange={handleLabelChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                autoFocus
                onFocus={(e) => e.target.select()}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="color-box-label-input"
                style={{ width: `${Math.max(label.length, 8) + 2}ch` }}
            />
        );
    }
    return <span onDoubleClick={handleDoubleClick}>{label || '\u00A0'}</span>;
};


const WorkspaceItem = ({
  item,
  isSelected,
  itemComponents,
  onStartItemInteraction,
  onStartLinking,
  onEndLinking,
  onItemDataChange,
  onDeleteItem,
}) => {
  const { x1, y1, x2, y2 } = item.coords;
  const width = x2 - x1;
  const height = y2 - y1;
  if (item.type === 'ColorBox') {
    const color = item.data?.color || '#a0aec0';
    const hexToRgba = (hex, alpha) => {
      if (!hex || !hex.startsWith('#')) return `rgba(160, 174, 192, ${alpha})`;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    const wrapperClass = `workspace-item color-box-wrapper ${isSelected ? 'selected' : ''}`;
    const ItemContentComponent = itemComponents['ColorBox']?.ItemComponent;

    return (
      <div
        className={wrapperClass}
        style={{
          left: `${x1}px`,
          top: `${y1}px`,
          width: `${width}px`,
          height: `${height}px`,
          '--box-color': color,
          zIndex: 0,
          border: `2px solid ${color}`,
          backgroundColor: hexToRgba(color, 0.2),
          boxShadow: 'none',
        }}
      >
        {isSelected && (
          <button
            className="delete-item-btn"
            onMouseDown={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
            onTouchStart={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
            title="Delete Item"
          >
            &times;
          </button>
        )}
        <div
          className="color-box-draggable-header"
          onMouseDown={(e) => onStartItemInteraction(e, item.id, 'move')}
          onTouchStart={(e) => onStartItemInteraction(e, item.id, 'move')}
          style={{
            backgroundColor: hexToRgba(color, 0.4),
            borderRight: `2px solid ${color}`,
            borderBottom: `2px solid ${color}`,
          }}
        >
          <EditableLabel item={item} onItemDataChange={onItemDataChange} />
        </div>
        <div className="color-box-content-wrapper">
          {ItemContentComponent && <ItemContentComponent itemData={item} onItemDataChange={onItemDataChange} />}
        </div>
        <div
          className="resize-handle"
          onMouseDown={(e) => onStartItemInteraction(e, item.id, 'resize')}
          onTouchStart={(e) => onStartItemInteraction(e, item.id, 'resize')}
        />
      </div>
    );
  }

  const isContainer = item.definition?.inputs.some(i => i.id === 'depends_on');
  
  const componentTypeKey = itemComponents[item.type]
    ? item.type
    : isContainer ? 'Container' : item.type;

  const ItemContentComponent = itemComponents[componentTypeKey]?.ItemComponent;
  const staticDefinition = item.definition;

  if (!ItemContentComponent || !staticDefinition) {
    console.warn(`Could not find component or definition for item type: ${item.type}`);
    return null;
  }

  const definition = getDynamicDefinition(item, staticDefinition);

  const itemStyle = {
      left: `${x1}px`, 
      top: `${y1}px`, 
      width: `${width}px`, 
      height: `${height}px`,
  };

  if (item.type === 'OverrideGroup') {
      itemStyle.zIndex = 0;
  }

  return (
    <div
      className={`workspace-item ${item.type === 'OverrideGroup' ? 'override-group-wrapper' : ''}`}
      style={itemStyle}
    >
      <div className={`workspace-item-content ${isSelected ? 'selected' : ''} ${item.type === 'OverrideGroup' ? 'override-group-content' : ''}`}>
        {isSelected && (
          <button
            className="delete-item-btn"
            onMouseDown={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
            onTouchStart={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
            title="Delete Item"
          >
            &times;
          </button>
        )}
        <div
          className="item-header"
          onMouseDown={(e) => onStartItemInteraction(e, item.id, 'move')}
          onTouchStart={(e) => onStartItemInteraction(e, item.id, 'move')}
        >
          {definition.name}
        </div>
        {renderConnectors(item, definition, onStartLinking, onEndLinking)}
        <div className="item-body">
          <ItemContentComponent
            itemData={item}
            itemDefinition={definition}
            onItemDataChange={onItemDataChange}
          />
        </div>
      </div>
      <div
        className="resize-handle"
        onMouseDown={(e) => onStartItemInteraction(e, item.id, 'resize')}
        onTouchStart={(e) => onStartItemInteraction(e, item.id, 'resize')}
      />
    </div>
  );
};

export default WorkspaceItem;
