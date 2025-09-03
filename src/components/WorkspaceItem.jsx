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


const renderConnectors = (item, definition, onConnectorInteraction) => {
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
            onMouseDown={!connector.disabled ? (e) => onConnectorInteraction(e, item.id, connector.id, setType) : null}
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
  onConnectorInteraction,
  onItemDataChange,
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
    const ColorBoxContent = itemComponents['ColorBox']?.ItemComponent;

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
        <div
          className="color-box-draggable-header"
          onMouseDown={(e) => onStartItemInteraction(e, item.id, 'move')}
          style={{
            backgroundColor: hexToRgba(color, 0.4),
            borderRight: `2px solid ${color}`,
            borderBottom: `2px solid ${color}`,
          }}
        >
          <EditableLabel item={item} onItemDataChange={onItemDataChange} />
        </div>
        <div className="color-box-content-wrapper">
          {ColorBoxContent && <ColorBoxContent itemData={item} onItemDataChange={onItemDataChange} />}
        </div>
        <div
          className="resize-handle"
          onMouseDown={(e) => onStartItemInteraction(e, item.id, 'resize')}
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

  return (
    <div
      className="workspace-item"
      style={{ left: `${x1}px`, top: `${y1}px`, width: `${width}px`, height: `${height}px` }}
    >
      <div className={`workspace-item-content ${isSelected ? 'selected' : ''}`}>
        <div
          className="item-header"
          onMouseDown={(e) => onStartItemInteraction(e, item.id, 'move')}
        >
          {definition.name}
        </div>
        {renderConnectors(item, definition, onConnectorInteraction)}
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
      />
    </div>
  );
};

export default WorkspaceItem;
