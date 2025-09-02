import React from 'react';
import '../../styles/Items.css';

export const itemDefinition = {
  name: 'DuckDNS SWAG',
  icon: 'https://github.com/linuxserver/docker-templates/raw/master/linuxserver.io/img/swag.gif',
  defaultSize: { width: 20, height: 24 },
  defaultData: {
    image: 'lsiodev/swag:5.0.0-env-templating',
    container_name: 'swag',
    cap_add: ['NET_ADMIN'],
    restart: 'unless-stopped',
    environment: [
      { key: 'PUID', value: '1000' },
      { key: 'PGID', value: '1000' },
      { key: 'TZ', value: 'Etc/UTC' },
      { key: 'URL', value: 'yourdomain.duckdns.org' },
      { key: 'DUCKDNSTOKEN', value: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    ],
    volumes: ['changeme:/config'],
    ports: ['443:443', '80:80'],
    connectedServices: [],
    connectedAuth: [],
    networks: [],
    secrets: [],
  },
  inputs: [
    { id: 'services_in', name: 'Services', compatibleTypes: ['service'], multiple: true, color: '#63b3ed' },
    { id: 'auth_in', name: 'Auth Providers', compatibleTypes: ['swag_auth'], multiple: true, color: '#4299e1' },
    { id: 'networks_in', name: 'Networks', compatibleTypes: ['network'], multiple: true, color: '#48bb78' },
    { id: 'secrets_in', name: 'Secrets', compatibleTypes: ['secret'], multiple: true, color: '#ed64a6' },
    { id: 'prop:restart', name: 'Restart', compatibleTypes: ['env_value'], multiple: false, color: '#4299e1' },
  ],
  outputs: [
    { id: 'portmap', name: 'Ports', type: 'portmap', multiple: true, color: '#f56565' },
  ],
};

export const ItemComponent = ({ itemData, onItemDataChange }) => {
  const data = itemData.data || {};
  const linkedInputs = data.linkedInputs || {};
  const connectedServices = data.connectedServices || [];
  const connectedAuth = data.connectedAuth || [];
  const environment = data.environment || [];

  const getEnv = (key) => environment.find(e => e.key === key)?.value || '';

  const handleDataChange = (field, value) => {
    onItemDataChange(itemData.id, { ...data, [field]: value });
  };
  
  const handleEnvChange = (key, value) => {
    const newEnv = environment.map(env => env.key === key ? { ...env, value } : env);
    handleDataChange('environment', newEnv);
  };

  const handleConfigVolChange = (path) => {
    const newVolumes = (data.volumes || []).map(v => v.endsWith(':/config') ? `${path}:/config` : v);
    handleDataChange('volumes', newVolumes);
  };
  
  const handleServicePortChange = (connectionId, newPort) => {
    const newServices = connectedServices.map(s => 
      s.connectionId === connectionId ? { ...s, port: newPort === '' ? '' : parseInt(newPort, 10) } : s
    );
    handleDataChange('connectedServices', newServices);
  };
  
  const handleServiceAuthChange = (connectionId, authProvider) => {
    const newServices = connectedServices.map(s =>
      s.connectionId === connectionId ? { ...s, authProvider } : s
    );
    handleDataChange('connectedServices', newServices);
  };

  const isEnvLinked = (key) => !!linkedInputs[`env:${key}`];
  const isVolLinked = (path) => !!linkedInputs[`volume:${path}`];
  const isPropLinked = (propName) => !!linkedInputs[`prop:${propName}`];

  const configVolume = (data.volumes || []).find(v => v.endsWith(':/config'))?.split(':')[0] || '';

  return (
    <div className="item-form-container scrollable">
      <details open>
        <summary>DuckDNS Settings</summary>
        <div className="form-section">
          <label>URL</label>
          <input type="text" value={getEnv('URL')} onChange={(e) => handleEnvChange('URL', e.target.value)} placeholder="yourdomain.duckdns.org" />
        </div>
        <div className="form-section">
          <label>DUCKDNSTOKEN</label>
          <input type="text" value={getEnv('DUCKDNSTOKEN')} onChange={(e) => handleEnvChange('DUCKDNSTOKEN', e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
        </div>
      </details>
      <details open>
        <summary>Connected Services</summary>
        {connectedServices.length > 0 ? (
          connectedServices.map(service => (
            <div key={service.connectionId} className="form-row" style={{gap: '8px'}}>
              <label htmlFor={`service-port-${service.connectionId}`}>{service.serviceName}:</label>
              <input
                id={`service-port-${service.connectionId}`}
                type="number"
                value={service.port}
                onChange={(e) => handleServicePortChange(service.connectionId, e.target.value)}
                style={{ width: '60px', backgroundColor: '#2d3748', color: 'white', border: '1px solid #4a5568', borderRadius: '4px', padding: '4px' }}
              />
              <select 
                value={service.authProvider || 'none'} 
                onChange={(e) => handleServiceAuthChange(service.connectionId, e.target.value)}
                style={{ flexGrow: 1, backgroundColor: '#2d3748', color: 'white', border: '1px solid #4a5568', borderRadius: '4px', padding: '4px' }}
              >
                  <option value="none">None</option>
                  {connectedAuth.map(auth => (
                      <option key={auth.connectionId} value={auth.name}>{auth.name}</option>
                  ))}
              </select>
            </div>
          ))
        ) : (
          <p style={{ fontSize: '0.9em', opacity: 0.7 }}>No services connected.</p>
        )}
      </details>
      <details>
        <summary>SWAG Configuration</summary>
        <div className="form-section">
          <label>PUID</label>
          <input type="text" value={getEnv('PUID')} onChange={(e) => handleEnvChange('PUID', e.target.value)} readOnly={isEnvLinked('PUID')} />
        </div>
        <div className="form-section">
          <label>PGID</label>
          <input type="text" value={getEnv('PGID')} onChange={(e) => handleEnvChange('PGID', e.target.value)} readOnly={isEnvLinked('PGID')} />
        </div>
        <div className="form-section">
          <label>Timezone (TZ)</label>
          <input type="text" value={getEnv('TZ')} onChange={(e) => handleEnvChange('TZ', e.target.value)} readOnly={isEnvLinked('TZ')} />
        </div>
        <div className="form-section">
          <label>/config Volume Path</label>
          <input type="text" value={configVolume} onChange={(e) => handleConfigVolChange(e.target.value)} readOnly={isVolLinked('/config')} />
        </div>
         <div className="form-section">
          <label>Restart Policy</label>
          <select value={data.restart || 'no'} onChange={(e) => handleDataChange('restart', e.target.value)} disabled={isPropLinked('restart')}>
              <option value="no">No</option>
              <option value="always">Always</option>
              <option value="on-failure">On Failure</option>
              <option value="unless-stopped">Unless Stopped</option>
          </select>
        </div>
      </details>
    </div>
  );
};
