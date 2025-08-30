import React, { useState, forwardRef, useMemo, useCallback, useEffect } from 'react';
import WorkspaceItem from './WorkspaceItem';
import ColorPicker from './ColorPicker';
import '../styles/Workspace.css';

const GRID_SIZE = 20;

const getDynamicDefinition = (item, staticDef) => {
    if (!item || !staticDef) return null;

    if (item.type === 'EnvVarOverride' && item.data?.key) {
        return {
            ...staticDef,
            outputs: [{
                id: `env_out:${item.data.key}`, name: item.data.key, type: 'env_value', multiple: true, color: '#f6ad55'
            }]
        };
    }

    const isContainer = staticDef.inputs.some(i => i.id === 'depends_on');
    if (!isContainer) {
        return staticDef;
    }
    
    const serviceData = item.data;
    const dynamicInputs = [];

    (serviceData.volumes || []).forEach((volumeString) => {
        const parts = volumeString.split(':');
        const target = parts.length > 1 ? parts[1] : '';
        if (target) {
            dynamicInputs.push({ id: `volume:${target}`, name: `vol: ${target.length > 12 ? `...${target.slice(-9)}` : target}`, compatibleTypes: ['mntpath', 'volume'], multiple: false, color: '#f6e05e' });
        }
    });
    
    if (Array.isArray(serviceData.environment)) {
        serviceData.environment.forEach((env) => {
            if (env.key) {
                dynamicInputs.push({ id: `env:${env.key}`, name: env.key, compatibleTypes: ['mntpath', 'env_value'], multiple: false, color: '#f6ad55' });
            }
        });
    }
    
    const combinedInputs = [...staticDef.inputs];
    const staticInputIds = new Set(staticDef.inputs.map(i => i.id));
    dynamicInputs.forEach(dInput => {
      if (!staticInputIds.has(dInput.id)) {
        combinedInputs.push(dInput);
      }
    });

    return { ...staticDef, inputs: combinedInputs };
};

const calculatePath = (startPos, endPos) => {
  const dx = endPos.x - startPos.x;
  if (dx < 0) {
    const midY = startPos.y + (endPos.y - startPos.y) / 2;
    return `M ${startPos.x} ${startPos.y} L ${startPos.x + GRID_SIZE * 2} ${startPos.y} L ${startPos.x + GRID_SIZE * 2} ${midY} L ${endPos.x - GRID_SIZE * 2} ${midY} L ${endPos.x - GRID_SIZE * 2} ${endPos.y} L ${endPos.x} ${endPos.y}`;
  }
  const midX = startPos.x + dx / 2;
  return `M ${startPos.x} ${startPos.y} L ${midX} ${startPos.y} L ${midX} ${endPos.y} L ${endPos.x} ${endPos.y}`;
};


const Workspace = forwardRef(({
  items, setItems, connections, onConnectionMade, transform, onTransformChange, itemComponents,
  draggingItem, onDrop, onDragOver, onDragLeave, selectedElement, setSelectedElement, onItemDataChange,
  onClearCanvasRequest, onGenerateComposeRequest
}, ref) => {
  const [interaction, setInteraction] = useState({ type: null, itemId: null });
  const [linking, setLinking] = useState(null);
  const [connectionPaths, setConnectionPaths] = useState([]);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [colorPickerPosition, setColorPickerPosition] = useState(null);
  const [paintingState, setPaintingState] = useState(null);

  const getConnectorPosition = useCallback((itemId, connectorId) => {
    const element = document.getElementById(`${itemId}-${connectorId}`);
    const item = items.find(i => i.id === itemId);
    if (!element || !item || !ref.current) return { x: 0, y: 0 };
    
    const itemDef = getDynamicDefinition(item, item.definition);
    const isOutput = itemDef?.outputs.some(c => c.id === connectorId);

    const workspaceRect = ref.current.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const screenY = elementRect.top + elementRect.height / 2;
    const worldY = (screenY - workspaceRect.top - transform.y) / transform.scale;
    const worldX = isOutput ? item.coords.x2 : item.coords.x1;

    return { x: worldX, y: worldY };
  }, [items, ref, transform]);

  useEffect(() => {
    const paths = connections.map(conn => {
      const startPos = getConnectorPosition(conn.from.itemId, conn.from.connectorId);
      const endPos = getConnectorPosition(conn.to.itemId, conn.to.connectorId);
      if (startPos.x === 0 || endPos.x === 0) return null;
      const pathData = calculatePath(startPos, endPos);
      const isSelected = selectedElement?.type === 'connection' && selectedElement?.id === conn.id;
      return (
        <g key={conn.id} className="connection-group" onClick={(e) => { e.stopPropagation(); setSelectedElement({ id: conn.id, type: 'connection' }); }}>
          <path d={pathData} className="connection-path-interactive" />
          <path d={pathData} className={`connection-path ${isSelected ? 'selected' : ''}`} style={{ stroke: conn.color }} />
        </g>
      );
    }).filter(Boolean);
    setConnectionPaths(paths);
  }, [connections, items, transform, selectedElement, getConnectorPosition, setSelectedElement]);

  useEffect(() => {
    if (!linking) return;

    const handleMouseMove = (e) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - transform.x) / transform.scale;
      const y = (e.clientY - rect.top - transform.y) / transform.scale;
      setLinking(prev => ({ ...prev, to: { x, y } }));
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [linking, ref, transform]);

  useEffect(() => {
    if (!paintingState) return;

    const handleMouseMove = (e) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - transform.x) / transform.scale;
      const y = (e.clientY - rect.top - transform.y) / transform.scale;
      const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;
      setPaintingState(prev => ({ ...prev, position: { x: snappedX, y: snappedY } }));
    };

    const handleMouseDown = (e) => {
      if (e.target.closest('.workspace-button')) {
        setPaintingState(null);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      
      if (paintingState.position) {
        const { color, size, position } = paintingState;
        const newItem = {
          id: `item_${Date.now()}`,
          type: 'ColorBox',
          definition: itemComponents['ColorBox'].definition,
          coords: {
            x1: position.x,
            y1: position.y,
            x2: position.x + size.width,
            y2: position.y + size.height,
          },
          data: { color, label: 'New Group' },
        };
        setItems(current => [...current, newItem]);
        setSelectedElement({ id: newItem.id, type: 'item' });
      }
      setPaintingState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [paintingState, ref, transform, setItems, setSelectedElement, itemComponents]);

  const isConnectionValid = (from, to) => {
    const fromItem = items.find(i => i.id === from.itemId);
    const toItem = items.find(i => i.id === to.itemId);
    if (!fromItem || !toItem) return false;

    const fromDef = getDynamicDefinition(fromItem, fromItem.definition);
    const toDef = getDynamicDefinition(toItem, toItem.definition);
    if (!fromDef || !toDef) return false;
    
    const fromConnector = fromDef.outputs.find(c => c.id === from.connectorId);
    const toConnector = toDef.inputs.find(c => c.id === to.connectorId);
    if (!fromConnector || !toConnector) return false;
    if (!toConnector.compatibleTypes?.includes(fromConnector.type)) return false;
    if (toConnector.multiple === false) {
      const isOccupied = connections.some(c => c.to.itemId === to.itemId && c.to.connectorId === to.connectorId);
      if (isOccupied) return false;
    }

    return true;
  };

  const handleConnectorInteraction = (e, itemId, connectorId, setType) => {
    e.stopPropagation();
    e.preventDefault();

    if (linking) {
      if (setType === 'inputs' && linking.from.itemId !== itemId) {
        const from = linking.from;
        const to = { itemId, connectorId };
        if (isConnectionValid(from, to)) {
            onConnectionMade({ from, to });
        }
      }
      setLinking(null);
    } else {
      if (setType === 'outputs') {
        const startPos = getConnectorPosition(itemId, connectorId);
        setLinking({ from: { itemId, connectorId }, to: startPos });

        const handleMouseUp = (upEvent) => {
          window.removeEventListener('mouseup', handleMouseUp);
          
          const targetEl = upEvent.target.closest('.connector');
          if (targetEl) {
            const endItemId = targetEl.dataset.itemid;
            const endConnectorId = targetEl.dataset.connectorid;
            
            if (endItemId && endItemId !== itemId) {
                const from = { itemId, connectorId };
                const to = { itemId: endItemId, connectorId: endConnectorId };
                if (isConnectionValid(from, to)) {
                    onConnectionMade({ from, to });
                }
                setLinking(null);
            }
          }
        };
        window.addEventListener('mouseup', handleMouseUp);
      }
    }
  };


  const startPan = (e) => {
    if (isColorPickerOpen) {
      setIsColorPickerOpen(false);
      return;
    }
    if (linking) {
      setLinking(null);
      return;
    }
    if (e.target.closest('.workspace-item') || e.target.closest('.connector') || e.target.closest('.connection-group')) return;
    setSelectedElement(null);
    e.preventDefault();
    const startX = e.clientX - transform.x;
    const startY = e.clientY - transform.y;
    const doPan = (moveEvent) => {
      onTransformChange({ ...transform, x: moveEvent.clientX - startX, y: moveEvent.clientY - startY });
    };
    const stopPan = () => {
      window.removeEventListener('mousemove', doPan);
      window.removeEventListener('mouseup', stopPan);
    };
    window.addEventListener('mousemove', doPan);
    window.addEventListener('mouseup', stopPan);
  };

  const handleWheel = useCallback((e) => {
    const scrollableParent = e.target.closest('.scrollable');
    if (scrollableParent && scrollableParent.scrollHeight > scrollableParent.clientHeight) {
        return;
    }
    e.preventDefault();
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const newScale = Math.max(0.2, Math.min(3, transform.scale - e.deltaY * 0.001));
    const scaleChange = newScale / transform.scale;
    const newX = mouseX - (mouseX - transform.x) * scaleChange;
    const newY = mouseY - (mouseY - transform.y) * scaleChange;
    onTransformChange({ x: newX, y: newY, scale: newScale });
  }, [ref, transform, onTransformChange]);

  useEffect(() => {
    const workspaceElement = ref.current;
    if (workspaceElement) {
      workspaceElement.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        workspaceElement.removeEventListener('wheel', handleWheel);
      };
    }
  }, [ref, handleWheel]);

  const handleStartItemInteraction = (e, itemId, type) => {
    if (e.target.closest('.connector')) return;
    setSelectedElement({ id: itemId, type: 'item' });
    e.preventDefault();
    e.stopPropagation();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const currentItem = items.find(it => it.id === itemId);
    const { x1, y1, x2, y2 } = currentItem.coords;

    const doInteraction = (moveEvent) => {
      const dx = (moveEvent.clientX - startMouseX) / transform.scale;
      const dy = (moveEvent.clientY - startMouseY) / transform.scale;
      let newCoords;
      if (type === 'move') {
        newCoords = { x1: x1 + dx, y1: y1 + dy, x2: x2 + dx, y2: y2 + dy };
      } else if (type === 'resize') {
        newCoords = { x1, y1, x2: Math.max(x2 + dx, x1 + 2 * GRID_SIZE), y2: Math.max(y2 + dy, y1 + 2 * GRID_SIZE) };
      }
      setItems(currentItems => currentItems.map(it => it.id === itemId ? { ...it, coords: newCoords } : it));
    };

    const stopInteraction = () => {
      setInteraction({ type: null, itemId: null });
      window.removeEventListener('mousemove', doInteraction);
      window.removeEventListener('mouseup', stopInteraction);
    };
    
    setInteraction({ type, itemId });
    window.addEventListener('mousemove', doInteraction);
    window.addEventListener('mouseup', stopInteraction);
  };

  const linkingPath = useMemo(() => {
    if (!linking) return null;
    const startPos = getConnectorPosition(linking.from.itemId, linking.from.connectorId);
    const endPos = linking.to;
    return <path d={calculatePath(startPos, endPos)} className="linking-path" />;
  }, [linking, getConnectorPosition]);

  const handlePaintButtonClick = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const pickerWidth = 200;
    const pickerHeight = 150;
    const gap = 10;
    const newX = rect.right - pickerWidth;
    const newY = rect.top - pickerHeight - gap;

    setColorPickerPosition({ x: newX, y: newY });
    setIsColorPickerOpen(true);
  };

  const handleColorSelected = (color) => {
    setIsColorPickerOpen(false);
    const defaultSize = itemComponents['ColorBox'].definition.defaultSize;
    const boxSize = {
      width: defaultSize.width * GRID_SIZE,
      height: defaultSize.height * GRID_SIZE,
    };
    setPaintingState({ color, size: boxSize, position: null });
  };

  const renderDragGhost = () => {
    if (!draggingItem || !draggingItem.ghostPosition) return null;
    const { defaultSize, ghostPosition, name, icon } = draggingItem;
    const width = defaultSize.width * GRID_SIZE;
    const height = defaultSize.height * GRID_SIZE;
    return (
      <div
        className="drag-ghost"
        style={{ left: `${ghostPosition.x}px`, top: `${ghostPosition.y}px`, width: `${width}px`, height: `${height}px` }}
      >
        <div className="workspace-item-content">
          <div className="item-header">{name}</div>
          <div className="item-connectors-bar">
            <div className="connectors-column inputs" />
            <div className="connectors-spacer">
              {icon && <img src={icon} alt={`${name} icon`} className="item-icon" />}
            </div>
            <div className="connectors-column outputs" />
          </div>
          <div className="item-body" />
        </div>
      </div>
    );
  };

  const renderPaintGhost = () => {
    if (!paintingState || !paintingState.position) return null;
    const { color, size, position } = paintingState;
    const hexToRgba = (hex, alpha) => {
        const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    };
    return (
      <div
        className="paint-ghost"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: `${size.height}px`,
          backgroundColor: hexToRgba(color, 0.2),
          border: `2px solid ${color}`,
        }}
      />
    );
  };

  return (
    <div
      ref={ref}
      className="workspace"
      onMouseDown={startPan}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      style={{
        backgroundSize: `${GRID_SIZE * transform.scale}px ${GRID_SIZE * transform.scale}px`,
        backgroundPosition: `${transform.x}px ${transform.y}px`,
        cursor: paintingState ? 'crosshair' : 'grab',
      }}
    >
      <div
        className="workspace-canvas"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        }}
      >
        <svg className="connections-svg">
          <g>
            {connectionPaths}
            {linkingPath}
          </g>
        </svg>
        {items.map((item) => (
          <WorkspaceItem
            key={item.id}
            item={item}
            isSelected={selectedElement?.type === 'item' && selectedElement?.id === item.id}
            itemComponents={itemComponents}
            onStartItemInteraction={handleStartItemInteraction}
            onConnectorInteraction={handleConnectorInteraction}
            onItemDataChange={onItemDataChange}
          />
        ))}
        {renderDragGhost()}
        {renderPaintGhost()}
      </div>
      <div className="workspace-buttons-top-right">
        <div className="workspace-button" onMouseDown={onGenerateComposeRequest} title="Generate Docker Compose">
            <img src="docker-logo.svg" alt="Generate Docker Compose" />
        </div>
      </div>
      <div className="workspace-buttons-bottom-right">
         <div className="workspace-button" onMouseDown={handlePaintButtonClick} title="Paint Group Box">
            <img src="paint.svg" alt="Paint Box" />
        </div>
        <div className="workspace-button" onMouseDown={onClearCanvasRequest} title="Clear Canvas">
            <img src="clear.svg" alt="Clear Canvas" />
        </div>
      </div>
      {isColorPickerOpen && <ColorPicker onSelectColor={handleColorSelected} position={colorPickerPosition} />}
    </div>
  );
});

export default Workspace;
