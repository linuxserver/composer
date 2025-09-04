import React, { useState, forwardRef, useMemo, useCallback, useEffect, useRef } from 'react';
import WorkspaceItem from './WorkspaceItem';
import ColorPicker from './ColorPicker';
import '../styles/Workspace.css';
import { getDynamicDefinition } from './WorkspaceItem';

const GRID_SIZE = 20;

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
  draggingItem, setDraggingItem, onDrop, onDragOver, onDragLeave, selectedElement, setSelectedElement, onItemDataChange,
  onClearCanvasRequest, onGenerateComposeRequest, onUploadRequest, onDeleteItem, onItemMoveEnd
}, ref) => {
  const [interaction, setInteraction] = useState({ type: null, itemId: null });
  const [linking, setLinking] = useState(null); // { from: { itemId, connectorId }, currentPos: {x, y} }
  const [connectionPaths, setConnectionPaths] = useState([]);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [colorPickerPosition, setColorPickerPosition] = useState(null);
  const [paintingState, setPaintingState] = useState(null);
  const fileInputRef = useRef(null);

  const pinchState = useRef({ isPinching: false, initialDist: 0, initialScale: 1 });
  const stopCurrentInteraction = useRef(null);

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

  const isConnectionValid = useCallback((from, to) => {
    if (!from || !to) return false;
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
  }, [items, connections]);

  // Handles starting a new link from an output connector
  const handleStartLinking = useCallback((fromItemId, fromConnectorId) => {
    // If clicking the same output again, cancel the link
    if (linking && linking.from.itemId === fromItemId && linking.from.connectorId === fromConnectorId) {
      setLinking(null);
      return;
    }
    const startPos = getConnectorPosition(fromItemId, fromConnectorId);
    setLinking({ from: { itemId: fromItemId, connectorId: fromConnectorId }, currentPos: startPos });
  }, [linking, getConnectorPosition]);

  // Handles completing a link on an input connector
  const handleEndLinking = useCallback((toItemId, toConnectorId) => {
    if (linking) {
      const from = linking.from;
      const to = { itemId: toItemId, connectorId: toConnectorId };
      if (isConnectionValid(from, to)) {
        onConnectionMade({ from, to });
      }
      setLinking(null); // Always terminate the link
    }
  }, [linking, isConnectionValid, onConnectionMade]);

  // Effect to draw the linking line and handle cancellation
  useEffect(() => {
    if (!linking) return;

    const handleMove = (e) => {
      const isTouchEvent = e.type.startsWith('touch');
      if (isTouchEvent) e.preventDefault();
      const touch = isTouchEvent ? e.touches[0] : e;
      
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = (touch.clientX - rect.left - transform.x) / transform.scale;
      const y = (touch.clientY - rect.top - transform.y) / transform.scale;
      setLinking(prev => (prev ? { ...prev, currentPos: { x, y } } : null));
    };
    
    // Cancel linking if user clicks/taps anywhere else
    const handleCancel = (e) => {
      if (!e.target.closest('.connector')) {
        setLinking(null);
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('mousedown', handleCancel);
    window.addEventListener('touchstart', handleCancel);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mousedown', handleCancel);
      window.removeEventListener('touchstart', handleCancel);
    };
  }, [linking, ref, transform.scale, transform.x, transform.y]);

  const startPan = useCallback((e) => {
    if (paintingState) return;
    // This check is now the main guard against panning while linking
    if (e.target.closest('.connector')) return;
    if (interaction.type) return;
    if (isColorPickerOpen) {
      setIsColorPickerOpen(false);
      return;
    }
    if (e.target.closest('.workspace-item') || e.target.closest('.connection-group')) return;
    
    const isTouchEvent = e.type.startsWith('touch');
    if (isTouchEvent && e.touches.length > 1) return;
    
    setSelectedElement(null);
    e.preventDefault();
    
    const touch = isTouchEvent ? e.touches[0] : e;
    const startX = touch.clientX - transform.x;
    const startY = touch.clientY - transform.y;

    const doPan = (moveEvent) => {
      if (pinchState.current.isPinching) {
        stopPan();
        return;
      }
      const moveTouch = isTouchEvent ? moveEvent.touches[0] : moveEvent;
      onTransformChange({ ...transform, x: moveTouch.clientX - startX, y: moveTouch.clientY - startY });
    };
    const stopPan = () => {
      stopCurrentInteraction.current = null;
      if (isTouchEvent) {
        window.removeEventListener('touchmove', doPan);
        window.removeEventListener('touchend', stopPan);
      } else {
        window.removeEventListener('mousemove', doPan);
        window.removeEventListener('mouseup', stopPan);
      }
    };
    stopCurrentInteraction.current = stopPan;
    if (isTouchEvent) {
      window.addEventListener('touchmove', doPan);
      window.addEventListener('touchend', stopPan);
    } else {
      window.addEventListener('mousemove', doPan);
      window.addEventListener('mouseup', stopPan);
    }
  }, [interaction.type, isColorPickerOpen, setSelectedElement, transform, onTransformChange, paintingState]);

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

  const handleStartItemInteraction = useCallback((e, itemId, type) => {
    if (e.target.closest('.connector')) return;
    const isTouchEvent = e.type.startsWith('touch');
    if (isTouchEvent && e.touches.length > 1) return;

    setSelectedElement({ id: itemId, type: 'item' });
    e.preventDefault();
    e.stopPropagation();

    const touch = isTouchEvent ? e.touches[0] : e;
    const startMouseX = touch.clientX;
    const startMouseY = touch.clientY;
    const currentItem = items.find(it => it.id === itemId);
    const { x1, y1, x2, y2 } = currentItem.coords;

    const doInteraction = (moveEvent) => {
      if (pinchState.current.isPinching) {
        stopInteraction(moveEvent);
        return;
      }
      const moveTouch = isTouchEvent ? moveEvent.touches[0] : moveEvent;
      const dx = (moveTouch.clientX - startMouseX) / transform.scale;
      const dy = (moveTouch.clientY - startMouseY) / transform.scale;
      let newCoords;
      if (type === 'move') {
        newCoords = { x1: x1 + dx, y1: y1 + dy, x2: x2 + dx, y2: y2 + dy };
      } else if (type === 'resize') {
        newCoords = { x1, y1, x2: Math.max(x2 + dx, x1 + 2 * GRID_SIZE), y2: Math.max(y2 + dy, y1 + 2 * GRID_SIZE) };
      }
      setItems(currentItems => currentItems.map(it => it.id === itemId ? { ...it, coords: newCoords } : it));
    };

    const stopInteraction = () => {
      stopCurrentInteraction.current = null;
      if (type === 'move') {
        onItemMoveEnd(itemId);
      }
      setInteraction({ type: null, itemId: null });
      if (isTouchEvent) {
        window.removeEventListener('touchmove', doInteraction);
        window.removeEventListener('touchend', stopInteraction);
      } else {
        window.removeEventListener('mousemove', doInteraction);
        window.removeEventListener('mouseup', stopInteraction);
      }
    };
    
    stopCurrentInteraction.current = stopInteraction;
    setInteraction({ type, itemId });
    if (isTouchEvent) {
      window.addEventListener('touchmove', doInteraction);
      window.addEventListener('touchend', stopInteraction);
    } else {
      window.addEventListener('mousemove', doInteraction);
      window.addEventListener('mouseup', stopInteraction);
    }
  }, [items, setItems, transform.scale, setSelectedElement, onItemMoveEnd]);

  const handleTouchStart = useCallback((e) => {
    if (e.target.closest('.connector')) return;
    if (draggingItem) {
      e.preventDefault();
      const touch = e.touches[0];
      if (!ref.current || !touch) return;
      
      const rect = ref.current.getBoundingClientRect();
      const x = (touch.clientX - rect.left - transform.x) / transform.scale;
      const y = (touch.clientY - rect.top - transform.y) / transform.scale;
      const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;
      
      onDrop(null, { x: snappedX, y: snappedY });
      return;
    }

    if (e.touches.length >= 2) {
      if (stopCurrentInteraction.current) {
        stopCurrentInteraction.current(e);
      }
      setInteraction({ type: null, itemId: null });
      setLinking(null);

      e.preventDefault();

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      pinchState.current = { isPinching: true, initialDist: dist, initialScale: transform.scale };
    } else {
      startPan(e);
    }
  }, [startPan, transform.scale, draggingItem, onDrop, ref, transform]);

  const handleTouchMove = useCallback((e) => {
    const scrollableParent = e.target.closest('.scrollable');
    if (scrollableParent && scrollableParent.scrollHeight > scrollableParent.clientHeight && e.touches.length === 1 && !interaction.type && !linking) {
      return; 
    }
    
    if (pinchState.current.isPinching && e.touches.length >= 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const newDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scale = pinchState.current.initialScale * (newDist / pinchState.current.initialDist);

      const rect = ref.current.getBoundingClientRect();
      const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
      const midY = (t1.clientY + t2.clientY) / 2 - rect.top;
      const newScale = Math.max(0.2, Math.min(3, scale));
      const scaleChange = newScale / transform.scale;

      const newX = midX - (midX - transform.x) * scaleChange;
      const newY = midY - (midY - transform.y) * scaleChange;

      onTransformChange({ x: newX, y: newY, scale: newScale });

    } else if (draggingItem && e.touches.length > 0) {
      e.preventDefault();
      const touch = e.touches[0];
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = (touch.clientX - rect.left - transform.x) / transform.scale;
      const y = (touch.clientY - rect.top - transform.y) / transform.scale;
      const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;
      setDraggingItem(prev => ({ ...prev, ghostPosition: { x: snappedX, y: snappedY } }));
    }
  }, [ref, transform, onTransformChange, draggingItem, setDraggingItem, interaction.type, linking]);
  
  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length < 2) {
      pinchState.current.isPinching = false;
    }
  }, []);
  
  useEffect(() => {
    const workspaceElement = ref.current;
    if (workspaceElement) {
      workspaceElement.addEventListener('wheel', handleWheel, { passive: false });
      workspaceElement.addEventListener('touchstart', handleTouchStart, { passive: false });
      workspaceElement.addEventListener('touchmove', handleTouchMove, { passive: false });
      workspaceElement.addEventListener('touchend', handleTouchEnd, { passive: false });
      
      return () => {
        workspaceElement.removeEventListener('wheel', handleWheel);
        workspaceElement.removeEventListener('touchstart', handleTouchStart);
        workspaceElement.removeEventListener('touchmove', handleTouchMove);
        workspaceElement.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [ref, handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const linkingPath = useMemo(() => {
    if (!linking) return null;
    const startPos = getConnectorPosition(linking.from.itemId, linking.from.connectorId);
    const endPos = linking.currentPos;
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

  const handleUploadClick = (e) => {
    e.stopPropagation();
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onUploadRequest(file);
    }
    e.target.value = null;
  };

  // Effect to show ghost preview when painting
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

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [paintingState, ref, transform]);

  // Handler to place the ColorBox on click
  const handleWorkspaceClick = (e) => {
    if (paintingState && paintingState.position) {
      const { color, size } = paintingState;
      const { x: x1, y: y1 } = paintingState.position;
      const x2 = x1 + size.width;
      const y2 = y1 + size.height;

      const newItem = {
        id: `item_${Date.now()}`,
        type: 'ColorBox',
        definition: itemComponents['ColorBox'].definition,
        coords: { x1, y1, x2, y2 },
        data: { color, notes: '', label: 'New Group' },
      };
      
      setItems(items => [...items, newItem]);
      setPaintingState(null);
      e.preventDefault();
      e.stopPropagation();
    }
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
      onClick={handleWorkspaceClick}
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
            onStartLinking={handleStartLinking}
            onEndLinking={handleEndLinking}
            onItemDataChange={onItemDataChange}
            onDeleteItem={onDeleteItem}
          />
        ))}
        {renderDragGhost()}
        {renderPaintGhost()}
      </div>
      <div className="workspace-buttons-top-right">
        <div className="workspace-button" onMouseDown={handleUploadClick} onTouchStart={handleUploadClick} title="Upload Compose Template">
            <img src="upload.svg" alt="Upload Template" />
        </div>
        <div className="workspace-button" onMouseDown={onGenerateComposeRequest} onTouchStart={onGenerateComposeRequest} title="Generate Docker Compose">
            <img src="docker-logo.svg" alt="Generate Docker Compose" />
        </div>
      </div>
      <div className="workspace-buttons-bottom-right">
         <div className="workspace-button" onMouseDown={handlePaintButtonClick} onTouchStart={handlePaintButtonClick} title="Paint Group Box">
            <img src="paint.svg" alt="Paint Box" />
        </div>
        <div className="workspace-button" onMouseDown={onClearCanvasRequest} onTouchStart={onClearCanvasRequest} title="Clear Canvas">
            <img src="clear.svg" alt="Clear Canvas" />
        </div>
      </div>
      {isColorPickerOpen && <ColorPicker onSelectColor={handleColorSelected} position={colorPickerPosition} />}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept=".yml,.yaml"
      />
    </div>
  );
});

export default Workspace;
