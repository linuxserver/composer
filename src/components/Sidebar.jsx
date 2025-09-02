import React from 'react';
import '../styles/Sidebar.css';

const DraggableItem = ({ item, onDragStartItem }) => (
  <div
    key={item.id}
    className="sidebar-item"
    draggable
    onDragStart={(e) => onDragStartItem(e, item)}
  >
    {item.name}
  </div>
);

const Sidebar = ({ onDragStartItem, itemDefinitions, isOpen, onToggleLsioModal, onOpenAddContainerModal }) => {

  const overrides = [];
  const topLevel = [];
  const ingressEgress = [];
  const swag = [];
  const swagAuth = [];

  if (itemDefinitions) {
    const overrideKeys = [
      'Env Var', 'User', 'Restart Policy', 
      'SHM Size', 'Security Option', 'Device',
      'Mount Path', 'Parent Path', 'Volume', 'Network', 'Label',
      'Secret', 'Config'
    ];
    const topLevelKeys = ['Top-level Network', 'Top-level Secret', 'Top-level Volume', 'Top-level Config'];
    const ingressEgressKeys = ['Default Bridge'];
    const swagKeys = ['DuckDNS SWAG'];
    const swagAuthKeys = ['Basic'];

    Object.keys(itemDefinitions).forEach(key => {
      const item = { id: key, ...itemDefinitions[key].definition };
      
      if (overrideKeys.includes(item.name)) {
        overrides.push(item);
      } else if (topLevelKeys.includes(item.name)) {
        topLevel.push(item);
      } else if (ingressEgressKeys.includes(item.name)) {
        ingressEgress.push(item);
      } else if (swagKeys.includes(item.name)) {
        swag.push(item);
      } else if (swagAuthKeys.includes(item.name)) {
        swagAuth.push(item);
      }
    });
  }

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <img src="lsio.svg" alt="LSIO Logo" />
        <h1>Composer</h1>
      </div>
      
      <div className="sidebar-items">
        <button className="sidebar-item lsio-button" onMouseDown={onToggleLsioModal}>
          LSIO Containers
        </button>
        <button className="sidebar-item add-container-button" onMouseDown={onOpenAddContainerModal}>
          + Container
        </button>

        <details>
          <summary>Ingress/Egress</summary>
          <div className="sidebar-group">
            {ingressEgress.map(item => <DraggableItem key={item.id} item={item} onDragStartItem={onDragStartItem} />)}
            <details>
              <summary>SWAG</summary>
              <div className="sidebar-group" style={{paddingLeft: '0.5rem'}}>
                {swag.map(item => <DraggableItem key={item.id} item={item} onDragStartItem={onDragStartItem} />)}
              </div>
            </details>
            <details>
              <summary>SWAG Auth</summary>
              <div className="sidebar-group" style={{paddingLeft: '0.5rem'}}>
                {swagAuth.map(item => <DraggableItem key={item.id} item={item} onDragStartItem={onDragStartItem} />)}
              </div>
            </details>
          </div>
        </details>

        <details>
          <summary>Settings Overrides</summary>
          <div className="sidebar-group">
            {overrides.map(item => <DraggableItem key={item.id} item={item} onDragStartItem={onDragStartItem} />)}
          </div>
        </details>

        <details>
          <summary>Top Level</summary>
          <div className="sidebar-group">
            {topLevel.map(item => <DraggableItem key={item.id} item={item} onDragStartItem={onDragStartItem} />)}
          </div>
        </details>

      </div>
    </aside>
  );
};

export default Sidebar;
