import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Workspace from './components/Workspace';
import ConfirmationModal from './components/ConfirmationModal';
import ComposeModal from './components/ComposeModal';
import LsioModal from './components/LsioModal';
import AddContainerModal from './components/AddContainerModal'; // Import the new modal
import './styles/App.css';
import yaml from 'js-yaml';
import { ItemComponent as ContainerItemComponent, createContainerDefinition } from './components/items/Container.jsx';
import { getDynamicDefinition as getDynamicDefinitionForItem } from './components/WorkspaceItem.jsx';
import { itemDefinition as ColorBoxDefinition, ItemComponent as ColorBoxItemComponent } from './components/items/ColorBox.jsx';

const itemModules = import.meta.glob('./components/items/*.jsx', { eager: true });
const GRID_SIZE = 20;
const API_URL = 'api-data.json';
const LOCAL_STORAGE_KEY = 'lsio-composer-session';

const getProviderOutputValue = (item, itemDef) => {
  if (!item || !item.data || !itemDef) return null;

  switch (itemDef.name) {
    case 'Env Var':
    case 'User':
    case 'SHM Size':
    case 'Restart Policy':
    case 'Security Option':
    case 'Device':
      return item.data.value ?? '';
    case 'Parent Path': return item.data.path ?? '/mnt/user';
    case 'Mount Path': {
      const parentPath = item.data.parentPath || '';
      const ownPath = item.data.path ?? '/path';
      return (parentPath + '/' + ownPath).replace(/\/+/g, '/');
    }
    case 'Volume':
    case 'Network':
    case 'Secret': // Override
    case 'Config': // Override
      return item.data.name || null;
    case 'Top-level Secret':
      return item.data.secretKey || null;
    case 'Top-level Volume':
      return item.data.volumeKey || null;
    case 'Top-level Config':
      return item.data.configKey || null;
    case 'Top-level Network':
      return item.data.networkName || null;
    case 'Label':
      return { key: item.data.key || '', value: item.data.value || '' };
    case 'Basic':
      return {
        name: 'basic',
        user: item.data?.user || 'username',
        pass: item.data?.pass || 'changeme',
      };
    default:
      // Check if it's a container by looking for a 'service' type output
      const isContainer = itemDef.outputs?.some(o => o.type === 'service');
      if (isContainer) {
        return item.data?.container_name || item.type;
      }
      return null;
  }
};

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [workspaceItems, setWorkspaceItems] = useState([]);
  const [connections, setConnections] = useState([]);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [loadedItemData, setLoadedItemData] = useState({});
  const [swagConfigs, setSwagConfigs] = useState([]);
  const [draggingItem, setDraggingItem] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [isLsioModalOpen, setIsLsioModalOpen] = useState(false);
  const [isAddContainerModalOpen, setIsAddContainerModalOpen] = useState(false);
  const [composeFileContent, setComposeFileContent] = useState('');
  const workspaceContainerRef = useRef(null);
  const originalItemsRef = useRef([]);
  const saveTimeoutRef = useRef(null);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const toggleLsioModal = () => {
    setIsLsioModalOpen(prev => !prev);
  };

  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedSession) {
        const sessionData = JSON.parse(savedSession);
        if (sessionData.items && sessionData.connections && sessionData.transform) {
          if (sessionData.items.every(item => item.definition)) {
            setWorkspaceItems(sessionData.items);
            setConnections(sessionData.connections);
            setTransform(sessionData.transform);
            return;
          }
        }
      }
    } catch (error) {
      console.error("Failed to load session from localStorage:", error);
    }
    if (workspaceContainerRef.current) {
      const rect = workspaceContainerRef.current.getBoundingClientRect();
      setTransform({ x: rect.width / 2, y: rect.height / 2, scale: 1 });
    }
  }, []);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const sessionData = {
          items: workspaceItems,
          connections: connections,
          transform: transform,
        };
        if (workspaceItems.length > 0 || connections.length > 0 || transform.x !== 0) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessionData));
        } else {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
      } catch (error) {
        console.error("Failed to save session to localStorage:", error);
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [workspaceItems, connections, transform]);

  const handleClearCanvasRequest = () => {
    setIsClearModalOpen(true);
  };

  const confirmClearCanvas = useCallback(() => {
    setWorkspaceItems([]);
    setConnections([]);
    setSelectedElement(null);
    if (workspaceContainerRef.current) {
      const rect = workspaceContainerRef.current.getBoundingClientRect();
      setTransform({ x: rect.width / 2, y: rect.height / 2, scale: 1 });
    } else {
      setTransform({ x: 0, y: 0, scale: 1 });
    }
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear session from localStorage:", error);
    }
    setIsClearModalOpen(false);
  }, []);

  const generateComposeFile = useCallback(() => {
    const compose = { services: {}, networks: {}, volumes: {}, secrets: {}, configs: {} };

    const arrayToObject = (arr, keyName = 'key', valueName = 'value') => {
        if (!Array.isArray(arr)) return arr;
        return arr.reduce((acc, item) => {
            if (item[keyName]) acc[item[keyName]] = item[valueName];
            return acc;
        }, {});
    };

    const cleanObject = (obj) => {
        if (obj === null || obj === undefined) return null;
        if (Array.isArray(obj)) {
            const newArr = obj.map(cleanObject).filter(v => v !== null && v !== undefined);
            return newArr.length > 0 ? newArr : null;
        }
        if (typeof obj === 'object') {
            const newObj = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    const value = obj[key];
                    if (value === '' || value === null || value === undefined) continue;
                    const cleanedValue = cleanObject(value);
                    if (cleanedValue !== null && cleanedValue !== undefined) {
                        newObj[key] = cleanedValue;
                    }
                }
            }
            return Object.keys(newObj).length > 0 ? newObj : null;
        }
        return obj;
    };

    workspaceItems.forEach(item => {
        const data = item.data || {};
        const type = item.type;

        if (type === 'TopLevelNetwork') {
            const networkKey = data.networkName;
            if (!networkKey) return;
            const networkConfig = JSON.parse(JSON.stringify(data));
            delete networkConfig.networkName;
            if (networkConfig.external) {
                compose.networks[networkKey] = { external: true };
                if (networkConfig.name) compose.networks[networkKey].name = networkConfig.name;
            } else {
                networkConfig.driver_opts = arrayToObject(networkConfig.driver_opts);
                networkConfig.labels = arrayToObject(networkConfig.labels);
                if (networkConfig.ipam?.config) {
                    networkConfig.ipam.config.forEach(conf => {
                        if (conf.aux_addresses) conf.aux_addresses = arrayToObject(conf.aux_addresses, 'hostname', 'ip');
                    });
                }
                if (networkConfig.ipam) networkConfig.ipam.options = arrayToObject(networkConfig.ipam.options);
                compose.networks[networkKey] = cleanObject(networkConfig);
            }
        } else if (type === 'TopLevelVolume') {
            const volumeKey = data.volumeKey;
            if (!volumeKey) return;
            if (data.external) {
                compose.volumes[volumeKey] = { external: true };
                if (data.name) compose.volumes[volumeKey].name = data.name;
            } else {
                const volumeConfig = {
                    driver: data.driver,
                    name: data.name,
                    driver_opts: arrayToObject(data.driver_opts),
                    labels: arrayToObject(data.labels)
                };
                compose.volumes[volumeKey] = cleanObject(volumeConfig) || null;
            }
        } else if (type === 'Secret') {
            const secretKey = data.secretKey;
            if (!secretKey) return;
            if (data.external) {
                compose.secrets[secretKey] = { external: true };
                if (data.name) compose.secrets[secretKey].name = data.name;
            } else {
                const secretConfig = { name: data.name };
                if (data.source === 'file' && data.file) secretConfig.file = data.file;
                else if (data.source === 'environment' && data.environment) secretConfig.environment = data.environment;
                compose.secrets[secretKey] = cleanObject(secretConfig);
            }
        } else if (type === 'TopLevelConfig') {
            const configKey = data.configKey;
            if (!configKey) return;
            if (data.external) {
                compose.configs[configKey] = { external: true };
                if (data.name) compose.configs[configKey].name = data.name;
            } else {
                const configConfig = { name: data.name };
                if (data.source === 'file' && data.file) configConfig.file = data.file;
                else if (data.source === 'environment' && data.environment) configConfig.environment = data.environment;
                else if (data.source === 'content' && data.content) configConfig.content = data.content;
                compose.configs[configKey] = cleanObject(configConfig);
            }
        } else if (type === 'Volume') {
            const volumeName = data.name;
            if (volumeName && !compose.volumes[volumeName]) {
                compose.volumes[volumeName] = null;
            }
        }
    });

    workspaceItems.forEach(item => {
        const itemDef = item.definition;
        const isContainer = itemDef?.inputs.some(i => i.id === 'depends_on');
        
        if (item.type === 'DuckdnsSwag') {
            const serviceName = item.data.container_name || 'swag';
            let serviceConfig = {
                image: item.data.image,
                container_name: serviceName,
                cap_add: item.data.cap_add,
                restart: item.data.restart,
                volumes: item.data.volumes,
                ports: item.data.ports,
                networks: item.data.networks,
                secrets: item.data.secrets,
                environment: {}
            };
            
            (item.data.environment || []).forEach(env => {
                serviceConfig.environment[env.key] = env.value;
            });
            
            serviceConfig.environment['VALIDATION'] = 'duckdns';
            serviceConfig.environment['SUBDOMAINS'] = 'wildcard';
            
            const connectedAuth = item.data.connectedAuth || [];
            const basicAuthProvider = connectedAuth.find(a => a.name === 'basic');

            if (basicAuthProvider) {
                serviceConfig.environment['PROXY_AUTH_BASIC_USER'] = basicAuthProvider.user;
                serviceConfig.environment['PROXY_AUTH_BASIC_PASS'] = basicAuthProvider.pass;
            }

            (item.data.connectedServices || []).forEach(service => {
                const proxyKey = `PROXY_CONFIG_${service.serviceName.toUpperCase()}`;
                let proxyConfig = { ...service.config };
                delete proxyConfig.name;
                proxyConfig.port = service.port;
                
                if (service.authProvider && service.authProvider !== 'none') {
                    proxyConfig.auth = service.authProvider;
                }
                
                serviceConfig.environment[proxyKey] = JSON.stringify(proxyConfig);
            });

            compose.services[serviceName] = cleanObject(serviceConfig);
            return;
        }

        if (!isContainer) return;

        const serviceName = item.data.container_name ? item.data.container_name.toLowerCase().replace(/[^a-zA-Z0-9_.-]/g, '') : item.type.toLowerCase().replace(/[^a-zA-Z0-9_.-]/g, '');
        if (!serviceName) return;
        let serviceConfig = JSON.parse(JSON.stringify(item.data));

        const internalKeys = ['linkedInputs', 'linkedNetworks', 'linkedSecrets', 'linkedConfigs', 'linkedDevices', 'linkedSecurityOpt', 'linkedDependsOn', '_originalPorts'];
        internalKeys.forEach(key => delete serviceConfig[key]);
        
        if (serviceConfig.init === false) delete serviceConfig.init;
        if (serviceConfig.stdin_open === false) delete serviceConfig.stdin_open;
        if (serviceConfig.tty === false) delete serviceConfig.tty;
        if (serviceConfig.privileged === false) delete serviceConfig.privileged;
        if (serviceConfig.read_only === false) delete serviceConfig.read_only;
        if (serviceConfig.oom_kill_disable === false) delete serviceConfig.oom_kill_disable;
        if (serviceConfig.pull_policy === 'missing') delete serviceConfig.pull_policy;
        if (serviceConfig.restart === 'no') delete serviceConfig.restart;

        serviceConfig.environment = arrayToObject(serviceConfig.environment);
        serviceConfig.labels = arrayToObject(serviceConfig.labels);
        serviceConfig.annotations = arrayToObject(serviceConfig.annotations);
        serviceConfig.extra_hosts = arrayToObject(serviceConfig.extra_hosts);
        serviceConfig.sysctls = arrayToObject(serviceConfig.sysctls);
        
        const cleanedServiceConfig = cleanObject(serviceConfig);
        if (cleanedServiceConfig) {
            compose.services[serviceName] = cleanedServiceConfig;
        }
    });

    if (Object.keys(compose.networks).length === 0) delete compose.networks;
    if (Object.keys(compose.volumes).length === 0) delete compose.volumes;
    if (Object.keys(compose.secrets).length === 0) delete compose.secrets;
    if (Object.keys(compose.configs).length === 0) delete compose.configs;
    if (Object.keys(compose.services).length === 0) delete compose.services;

    let yamlString = '# Generated with LSIO Composer\n';
    if (Object.keys(compose).length > 0) {
      yamlString += yaml.dump(compose, { indent: 2, lineWidth: -1, noRefs: true, nullsAsEmptyString: true }).replace(/: null/g, ':');
    } else {
      yamlString += '# Your workspace is empty. Add items to generate a compose file.\n';
    }

    const sessionData = { items: workspaceItems, connections, transform };
    const jsonString = JSON.stringify(sessionData);
    const base64String = btoa(unescape(encodeURIComponent(jsonString)));
    const finalFileContent = `${yamlString}\n# LSIO_COMPOSER_DATA::${base64String}`;
    
    setComposeFileContent(finalFileContent);
    setIsComposeModalOpen(true);
  }, [workspaceItems, connections, transform]);

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggingItem) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            const fileContent = event.target.result;
            const lines = fileContent.split('\n');
            let lastLine = '';
            for (let i = lines.length - 1; i >= 0; i--) {
                if (lines[i].trim() !== '') {
                    lastLine = lines[i].trim();
                    break;
                }
            }
            if (lastLine.startsWith('# LSIO_COMPOSER_DATA::')) {
                try {
                    const base64String = lastLine.substring('# LSIO_COMPOSER_DATA::'.length);
                    const jsonString = decodeURIComponent(escape(atob(base64String)));
                    const sessionData = JSON.parse(jsonString);
                    if (sessionData.items && sessionData.connections && sessionData.transform) {
                        if (workspaceItems.length > 0 && !window.confirm('This will clear your current workspace and load the new file. Are you sure?')) {
                            return;
                        }
                        setWorkspaceItems(sessionData.items);
                        setConnections(sessionData.connections);
                        setTransform(sessionData.transform);
                        setSelectedElement(null);
                    } else {
                        alert('Error: The composer data in the file is malformed.');
                    }
                } catch (error) {
                    console.error('Failed to parse composer data from file:', error);
                    alert('Error: Could not parse the composer data from the dropped file.');
                }
            } else {
                alert('This does not appear to be a valid LSIO Composer file (missing metadata).');
            }
        };
        reader.readAsText(file);
        e.dataTransfer.clearData();
    }
  }, [workspaceItems, draggingItem]);

  useEffect(() => {
    const loadItems = async () => {
      const loadedData = {};
      for (const path in itemModules) {
        const module = itemModules[path];
        const componentName = path.split('/').pop().replace('.jsx', '');
        loadedData[componentName] = {
          definition: module.itemDefinition,
          ItemComponent: module.ItemComponent,
        };
      }
      
      loadedData['ColorBox'] = { definition: ColorBoxDefinition, ItemComponent: ColorBoxItemComponent };
      loadedData['Container'] = { definition: null, ItemComponent: ContainerItemComponent };

      try {
        const swagResponse = await fetch('swag_data.yml');
        const swagYaml = await swagResponse.text();
        const swagData = yaml.load(swagYaml);
        setSwagConfigs(swagData.swag_configs || []);
      } catch (e) {
        console.error("Failed to load swag_data.yml", e);
      }

      try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
        const apiData = await response.json();
        const containers = apiData?.data?.repositories?.linuxserver || [];
        containers.forEach(container => {
          const containerType = container.name; 
          loadedData[containerType] = {
            definition: createContainerDefinition(container),
            ItemComponent: ContainerItemComponent,
          };
        });
      } catch (error) {
        console.error("Failed to load or parse container data from API:", error);
      }
      setLoadedItemData(loadedData);
    };
    loadItems();
  }, []);

  const propagateItemUpdate = useCallback((startItemId, currentItems, currentConnections, allOriginalItems) => {
    let itemsToUpdate = [...currentItems];
    const updateQueue = [startItemId];
    const processed = new Set([startItemId]);
  
    while (updateQueue.length > 0) {
      const currentItemId = updateQueue.shift();
      const fromItem = itemsToUpdate.find(i => i.id === currentItemId);
      if (!fromItem) continue;

      const originalFromItem = allOriginalItems.find(i => i.id === currentItemId);
      const fromItemDef = getDynamicDefinitionForItem(fromItem, fromItem.definition);
      const incomingValue = getProviderOutputValue(fromItem, fromItemDef);
      const oldValue = originalFromItem ? getProviderOutputValue(originalFromItem, fromItem.definition) : null;
  
      const downstreamConnections = currentConnections.filter(c => c.from.itemId === currentItemId);
  
      for (const conn of downstreamConnections) {
        const toItemId = conn.to.itemId;
        const toItemIndex = itemsToUpdate.findIndex(i => i.id === toItemId);
        if (toItemIndex === -1) continue;
  
        const originalToItem = itemsToUpdate[toItemIndex];
        let newToData = { ...originalToItem.data };
        let dataChanged = false;
        const toConnectorId = conn.to.connectorId;

        if (conn.type === 'portmap' && toConnectorId === 'ports') {
            const allBridgeConnections = currentConnections.filter(c => c.to.itemId === toItemId && c.to.connectorId === 'ports');
            const allNewPorts = allBridgeConnections.flatMap(bridgeConn => {
                const sourceContainer = itemsToUpdate.find(i => i.id === bridgeConn.from.itemId);
                if (!sourceContainer?.data?.ports) return [];
                return sourceContainer.data.ports.map(pStr => {
                    const parts = pStr.split(':');
                    const internalPort = parts.length > 1 ? parts[1] : parts[0];
                    const externalPort = parts.length > 1 ? parts[0] : '';
                    return {
                        connectionId: bridgeConn.id,
                        name: `${sourceContainer.data.container_name || sourceContainer.type}:${internalPort}`,
                        mappedPort: externalPort === '' ? '' : parseInt(externalPort, 10),
                    };
                });
            });
            if (JSON.stringify(newToData.ports || []) !== JSON.stringify(allNewPorts)) {
                newToData.ports = allNewPorts;
                dataChanged = true;
            }
        } else if (conn.type === 'service' && toConnectorId === 'services_in') {
             const swagItem = originalToItem;
             const connectedContainer = fromItem;
             const serviceName = connectedContainer.data.container_name || connectedContainer.type;
             const newConnectedServices = (swagItem.data.connectedServices || []).map(s => {
                 if (s.connectionId === conn.id) {
                     return { ...s, serviceName };
                 }
                 return s;
             });
             if (JSON.stringify(swagItem.data.connectedServices || []) !== JSON.stringify(newConnectedServices)) {
                 newToData.connectedServices = newConnectedServices;
                 dataChanged = true;
             }
        } else if (conn.type === 'swag_auth' && toConnectorId === 'auth_in') {
            newToData.connectedAuth = (newToData.connectedAuth || []).map(auth =>
                auth.connectionId === conn.id ? { ...auth, ...incomingValue } : auth
            );
            dataChanged = true;
        } else if (toConnectorId.startsWith('prop:')) {
            const propName = toConnectorId.substring('prop:'.length);
            if (newToData[propName] !== incomingValue) {
                newToData[propName] = incomingValue;
                dataChanged = true;
            }
        } else if (toConnectorId === 'depends_on') {
            newToData.depends_on = (newToData.depends_on || []).map(dep => dep === oldValue ? incomingValue : dep);
            dataChanged = true;
        } else if (toConnectorId === 'networks_in') {
            newToData.networks = (newToData.networks || []).map(n => n === oldValue ? incomingValue : n);
            newToData.linkedNetworks = (newToData.linkedNetworks || []).map(n => n === oldValue ? incomingValue : n);
            dataChanged = true;
        } else if (toConnectorId === 'secrets_in') {
            newToData.secrets = (newToData.secrets || []).map(s => s === oldValue ? incomingValue : s);
            newToData.linkedSecrets = (newToData.linkedSecrets || []).map(s => s === oldValue ? incomingValue : s);
            dataChanged = true;
        } else if (toConnectorId === 'configs_in') {
            newToData.configs = (newToData.configs || []).map(s => s === oldValue ? incomingValue : s);
            newToData.linkedConfigs = (newToData.linkedConfigs || []).map(s => s === oldValue ? incomingValue : s);
            dataChanged = true;
        } else if (toConnectorId === 'devices_in') {
            newToData.devices = (newToData.devices || []).map(d => d === oldValue ? incomingValue : d);
            newToData.linkedDevices = (newToData.linkedDevices || []).map(d => d === oldValue ? incomingValue : d);
            dataChanged = true;
        } else if (toConnectorId === 'security_opt_in') {
            newToData.security_opt = (newToData.security_opt || []).map(s => s === oldValue ? incomingValue : s);
            newToData.linkedSecurityOpt = (newToData.linkedSecurityOpt || []).map(s => s === oldValue ? incomingValue : s);
            dataChanged = true;
        } else if (toConnectorId === 'labels_in') {
            newToData.labels = (newToData.labels || []).map(l => l.connectionId === conn.id ? { ...incomingValue, connectionId: conn.id, isLinked: true } : l);
            dataChanged = true;
        } else if (toConnectorId.startsWith('volume:')) {
            const targetPath = toConnectorId.substring('volume:'.length);
            newToData.volumes = (newToData.volumes || []).map(v => {
                const parts = v.split(':');
                const currentTarget = parts.length > 1 ? parts[1] : v;
                if (currentTarget === targetPath && parts[0] !== incomingValue) {
                    dataChanged = true;
                    return `${incomingValue}:${targetPath}`;
                }
                return v;
            });
        } else if (toConnectorId.startsWith('env:')) {
          const key = toConnectorId.substring('env:'.length);
          const fromKey = conn.from.connectorId.substring('env_out:'.length);
          if (key === fromKey) {
            newToData.environment = (newToData.environment || []).map(env => {
                if (env.key === key && env.value !== incomingValue) {
                    dataChanged = true;
                    return { ...env, value: incomingValue };
                }
                return env;
            });
          }
        } else if (conn.type === 'mntpath' && toConnectorId === 'parentpath') {
            if (newToData.parentPath !== incomingValue) {
                newToData.parentPath = incomingValue;
                dataChanged = true;
            }
        }

        if (dataChanged) {
          itemsToUpdate[toItemIndex] = { ...originalToItem, data: newToData };
          if (!processed.has(toItemId)) {
            updateQueue.push(toItemId);
            processed.add(toItemId);
          }
        }
      }
    }
    return itemsToUpdate;
  }, [swagConfigs]);
  
  const handleItemDataChange = useCallback((itemId, newData) => {
    setWorkspaceItems(prevItems => {
        originalItemsRef.current = prevItems;
        const itemToChange = prevItems.find(i => i.id === itemId);
        let itemsToUpdate = [...prevItems];

        if (itemToChange?.type === 'Defaultbridge') {
            const oldPorts = itemToChange.data?.ports || [];
            const newPortsData = newData.ports || [];
            const changedPorts = newPortsData.filter(np => {
                const op = oldPorts.find(p => p.connectionId === np.connectionId);
                return op && op.mappedPort !== np.mappedPort;
            });
            let containerIdsToPropagate = new Set();
            changedPorts.forEach(changedPort => {
                const connection = connections.find(c => c.id === changedPort.connectionId);
                if (!connection) return;
                const containerId = connection.from.itemId;
                const containerIndex = itemsToUpdate.findIndex(i => i.id === containerId);
                if (containerIndex === -1) return;
                const internalPort = changedPort.name.split(':')[1];
                const container = itemsToUpdate[containerIndex];
                const newContainerPorts = (container.data.ports || []).map(pStr => {
                    const parts = pStr.split(':');
                    const pInternal = parts.length > 1 ? parts[1] : parts[0];
                    return pInternal === internalPort ? `${changedPort.mappedPort}:${pInternal}` : pStr;
                });
                itemsToUpdate[containerIndex] = { ...container, data: { ...container.data, ports: newContainerPorts }};
                containerIdsToPropagate.add(containerId);
            });
            containerIdsToPropagate.forEach(cId => {
                itemsToUpdate = propagateItemUpdate(cId, itemsToUpdate, connections, prevItems);
            });
            const bridgeIndex = itemsToUpdate.findIndex(i => i.id === itemId);
            if (bridgeIndex > -1) {
                itemsToUpdate[bridgeIndex] = { ...itemsToUpdate[bridgeIndex], data: { ...itemsToUpdate[bridgeIndex].data, ...newData }};
            }
            return itemsToUpdate;
        }

        let updatedItems = prevItems.map(item =>
            item.id === itemId ? { ...item, data: { ...item.data, ...newData } } : item
        );
        if (itemToChange?.type === 'ColorBox') {
            return updatedItems;
        }
        return propagateItemUpdate(itemId, updatedItems, connections, originalItemsRef.current);
    });
  }, [connections, propagateItemUpdate]);

  const handleConnectionMade = useCallback((connection) => {
    const fromItem = workspaceItems.find(i => i.id === connection.from.itemId);
    const toItem = workspaceItems.find(i => i.id === connection.to.itemId);
    if (!fromItem || !toItem) return;

    const fromItemDef = getDynamicDefinitionForItem(fromItem, fromItem.definition);
    const fromConnector = fromItemDef.outputs.find(c => c.id === connection.from.connectorId);
    if (!fromConnector) return;

    const newConnection = {
      id: `conn_${Date.now()}`,
      from: connection.from,
      to: connection.to,
      type: fromConnector.type,
      color: fromConnector.color,
    };
    
    setConnections(prev => [...prev, newConnection]);

    setWorkspaceItems(prevItems => {
        originalItemsRef.current = prevItems;
        let updatedItems = [...prevItems];
        const toItemIndex = updatedItems.findIndex(i => i.id === toItem.id);
        if(toItemIndex === -1) return prevItems;

        const originalToItem = updatedItems[toItemIndex];
        let newToData = { ...originalToItem.data };
        const toConnectorId = connection.to.connectorId;
        const incomingValue = getProviderOutputValue(fromItem, fromItem.definition);

        if (toItem.type === 'DuckdnsSwag' && toConnectorId === 'services_in') {
            const fromItemIndex = updatedItems.findIndex(i => i.id === fromItem.id);
            const containerToConnect = updatedItems[fromItemIndex];
            
            const originalPorts = containerToConnect.data.ports || [];
            const storedOriginalPorts = containerToConnect.data._originalPorts || originalPorts;
            const clearedContainerData = { ...containerToConnect.data, ports: [], _originalPorts: storedOriginalPorts };
            updatedItems[fromItemIndex] = { ...containerToConnect, data: clearedContainerData };
            
            const serviceName = containerToConnect.data.container_name || containerToConnect.type;
            const swagConfig = swagConfigs.find(c => c.name === serviceName.toLowerCase());
            let port;
            if (swagConfig) {
                port = swagConfig.port;
            } else if (storedOriginalPorts.length > 0) {
                const firstPort = storedOriginalPorts[0];
                const parts = firstPort.split(':');
                port = parts.length > 1 ? parseInt(parts[1], 10) : parseInt(parts[0], 10);
            } else {
                port = 80;
            }
            
            const newService = {
                connectionId: newConnection.id,
                serviceName: serviceName,
                port: port,
                authProvider: 'none',
                config: swagConfig || { name: serviceName.toLowerCase() }
            };
            
            newToData = {
                ...newToData,
                connectedServices: [...(newToData.connectedServices || []), newService]
            };
        } else if (toItem.type === 'DuckdnsSwag' && toConnectorId === 'auth_in') {
            const authProviderData = getProviderOutputValue(fromItem, fromItemDef);
            newToData.connectedAuth = [
                ...(newToData.connectedAuth || []),
                { connectionId: newConnection.id, ...authProviderData }
            ];
        } else {
            newToData.linkedInputs = { ...newToData.linkedInputs, [toConnectorId]: true };
            if (toConnectorId === 'depends_on') {
                newToData.depends_on = [...(newToData.depends_on || []), incomingValue];
            } else if (toConnectorId === 'networks_in') {
                if (!(newToData.networks || []).includes(incomingValue)) newToData.networks = [...(newToData.networks || []), incomingValue];
                newToData.linkedNetworks = [...(newToData.linkedNetworks || []), incomingValue];
            } else if (toConnectorId === 'secrets_in') {
                if (!(newToData.secrets || []).includes(incomingValue)) newToData.secrets = [...(newToData.secrets || []), incomingValue];
                newToData.linkedSecrets = [...(newToData.linkedSecrets || []), incomingValue];
            } else if (toConnectorId === 'configs_in') {
                if (!(newToData.configs || []).includes(incomingValue)) newToData.configs = [...(newToData.configs || []), incomingValue];
                newToData.linkedConfigs = [...(newToData.linkedConfigs || []), incomingValue];
            } else if (toConnectorId === 'devices_in') {
                if (!(newToData.devices || []).includes(incomingValue)) newToData.devices = [...(newToData.devices || []), incomingValue];
                newToData.linkedDevices = [...(newToData.linkedDevices || []), incomingValue];
            } else if (toConnectorId === 'security_opt_in') {
                if (!(newToData.security_opt || []).includes(incomingValue)) newToData.security_opt = [...(newToData.security_opt || []), incomingValue];
                newToData.linkedSecurityOpt = [...(newToData.linkedSecurityOpt || []), incomingValue];
            } else if (toConnectorId === 'labels_in') {
                newToData.labels = [...(newToData.labels || []), { ...incomingValue, connectionId: newConnection.id, isLinked: true }];
            }
        }

        updatedItems[toItemIndex] = { ...originalToItem, data: newToData };
        return propagateItemUpdate(fromItem.id, updatedItems, [...connections, newConnection], originalItemsRef.current);
    });
  }, [connections, workspaceItems, propagateItemUpdate, swagConfigs]);

  const handleDisconnection = useCallback((connection) => {
    const fromItem = workspaceItems.find(i => i.id === connection.from.itemId);
    const toItem = workspaceItems.find(i => i.id === connection.to.itemId);
    if (!toItem || !fromItem) return;

    setWorkspaceItems(prevItems => {
      const toItemIndex = prevItems.findIndex(i => i.id === toItem.id);
      if (toItemIndex === -1) return prevItems;

      let itemsToUpdate = [...prevItems];
      const originalToItem = itemsToUpdate[toItemIndex];
      let newToData = { ...originalToItem.data };
      const toConnectorId = connection.to.connectorId;
      
      const valueToUnlink = getProviderOutputValue(fromItem, fromItem.definition);

      const newLinkedInputs = { ...newToData.linkedInputs };
      delete newLinkedInputs[toConnectorId];
      newToData.linkedInputs = newLinkedInputs;
      
      if (toItem.type === 'DuckdnsSwag' && toConnectorId === 'services_in') {
          const fromItemIndex = itemsToUpdate.findIndex(i => i.id === fromItem.id);
          const fromContainer = itemsToUpdate[fromItemIndex];
          if (fromContainer.data._originalPorts) {
              const restoredData = { ...fromContainer.data, ports: fromContainer.data._originalPorts };
              delete restoredData._originalPorts;
              itemsToUpdate[fromItemIndex] = { ...fromContainer, data: restoredData };
          }
          newToData.connectedServices = (newToData.connectedServices || []).filter(s => s.connectionId !== connection.id);
      } else if (toItem.type === 'DuckdnsSwag' && toConnectorId === 'auth_in') {
        const authProvider = (newToData.connectedAuth || []).find(a => a.connectionId === connection.id);
        if (authProvider) {
            newToData.connectedServices = (newToData.connectedServices || []).map(s =>
                s.authProvider === authProvider.name ? { ...s, authProvider: 'none' } : s
            );
        }
        newToData.connectedAuth = (newToData.connectedAuth || []).filter(a => a.connectionId !== connection.id);
      } else if (toConnectorId === 'ports' && connection.type === 'portmap') {
        newToData.ports = (newToData.ports || []).filter(p => p.connectionId !== connection.id);
      } else if (toConnectorId === 'depends_on') {
        newToData.depends_on = (newToData.depends_on || []).filter(dep => dep !== valueToUnlink);
      } else if (toConnectorId === 'networks_in') {
        newToData.linkedNetworks = (newToData.linkedNetworks || []).filter(n => n !== valueToUnlink);
      } else if (toConnectorId === 'secrets_in') {
        newToData.linkedSecrets = (newToData.linkedSecrets || []).filter(s => s !== valueToUnlink);
      } else if (toConnectorId === 'configs_in') {
        newToData.linkedConfigs = (newToData.linkedConfigs || []).filter(c => c !== valueToUnlink);
      } else if (toConnectorId === 'devices_in') {
        newToData.linkedDevices = (newToData.linkedDevices || []).filter(d => d !== valueToUnlink);
      } else if (toConnectorId === 'security_opt_in') {
        newToData.linkedSecurityOpt = (newToData.linkedSecurityOpt || []).filter(s => s !== valueToUnlink);
      } else if (toConnectorId === 'labels_in') {
        newToData.labels = (newToData.labels || []).filter(l => l.connectionId !== connection.id);
      } else if (toConnectorId === 'parentpath' && connection.type === 'mntpath') {
        newToData.parentPath = '';
      }
      
      itemsToUpdate[toItemIndex] = { ...originalToItem, data: newToData };
      return propagateItemUpdate(toItem.id, itemsToUpdate, connections.filter(c => c.id !== connection.id), prevItems);
    });
  }, [workspaceItems, connections, propagateItemUpdate]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete') && selectedElement) {
        if (selectedElement.type === 'item') {
          const itemId = selectedElement.id;
          const connectionsToRemove = connections.filter(c => c.from.itemId === itemId || c.to.itemId === itemId);
          connectionsToRemove.forEach(handleDisconnection);
          setConnections(conns => conns.filter(c => c.from.itemId !== itemId && c.to.itemId !== itemId));
          setWorkspaceItems(items => items.filter(item => item.id !== itemId));
        } else if (selectedElement.type === 'connection') {
          const connId = selectedElement.id;
          const connToRemove = connections.find(c => c.id === connId);
          if (connToRemove) {
            handleDisconnection(connToRemove);
            setConnections(conns => conns.filter(c => c.id !== connId));
          }
        }
        setSelectedElement(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, connections, handleDisconnection]);

  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('application/reactflow', item.id);
    e.dataTransfer.effectAllowed = 'move';
    const img = new Image();
    img.src = 'data:image/gif;base64,R0L GODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
    setDraggingItem({ type: item.id, ...loadedItemData[item.id].definition, ghostPosition: null });
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (!draggingItem || !workspaceContainerRef.current) return;
    const rect = workspaceContainerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - transform.x) / transform.scale;
    const y = (e.clientY - rect.top - transform.y) / transform.scale;
    const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;
    setDraggingItem(prev => ({ ...prev, ghostPosition: { x: snappedX, y: snappedY } }));
  }, [draggingItem, transform]);

  const handleDragLeave = useCallback(() => {
    if (draggingItem) setDraggingItem(prev => ({ ...prev, ghostPosition: null }));
  }, [draggingItem]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggingItem || !draggingItem.ghostPosition) {
      if (draggingItem) setDraggingItem(null);
      handleFileDrop(e);
      return;
    };
    const { ghostPosition, type } = draggingItem;
    const itemDefinition = loadedItemData[type].definition;
    const { x: x1, y: y1 } = ghostPosition;
    const x2 = x1 + itemDefinition.defaultSize.width * GRID_SIZE;
    const y2 = y1 + itemDefinition.defaultSize.height * GRID_SIZE;
    
    let finalData = { ...(itemDefinition.defaultData || {}), linkedInputs: {} };

    // Handle container name de-duplication
    const isContainer = itemDefinition.inputs.some(i => i.id === 'depends_on');
    if (isContainer || type === 'DuckdnsSwag') {
      const baseName = finalData.container_name || type;
      let newContainerName = baseName;
      let counter = 1;
      const allContainerNames = new Set(workspaceItems.map(item => item.data?.container_name).filter(Boolean));
      while (allContainerNames.has(newContainerName)) {
          newContainerName = `${baseName}-${counter}`;
          counter++;
      }
      finalData.container_name = newContainerName;
    }

    const newItem = { id: `item_${Date.now()}`, type, definition: itemDefinition, coords: { x1, y1, x2, y2 }, data: finalData };
    setWorkspaceItems((items) => [...items, newItem]);
    setSelectedElement({ id: newItem.id, type: 'item' });
    setDraggingItem(null);
  }, [draggingItem, handleFileDrop, loadedItemData, workspaceItems]);

  const handleAddCustomContainer = useCallback(({ name, iconUrl }) => {
    const allContainerNames = new Set(workspaceItems.map(item => item.data?.container_name).filter(Boolean));
    let newContainerName = name;
    let counter = 1;
    while (allContainerNames.has(newContainerName)) {
      newContainerName = `${name}-${counter}`;
      counter++;
    }

    const genericDef = {
        name: name,
        icon: iconUrl || '/docker-logo.svg',
        defaultSize: { width: 24, height: 20 },
        defaultData: { image: '', container_name: newContainerName, restart: 'unless-stopped', environment: [], labels: [], ports: [], volumes: [], networks: [], devices: [], security_opt: [], secrets: [], configs: [] },
        inputs: [ { id: 'depends_on', name: 'Depends On', compatibleTypes: ['service'], multiple: true, color: '#63b3ed' }, { id: 'labels_in', name: 'Labels', compatibleTypes: ['label'], multiple: true, color: '#a0aec0' }, { id: 'networks_in', name: 'Networks', compatibleTypes: ['network'], multiple: true, color: '#48bb78' }, { id: 'secrets_in', name: 'Secrets', compatibleTypes: ['secret'], multiple: true, color: '#ed64a6' }, { id: 'configs_in', name: 'Configs', compatibleTypes: ['config'], multiple: true, color: '#d69e2e' }, { id: 'devices_in', name: 'Devices', compatibleTypes: ['mntpath'], multiple: true, color: '#667eea' }, { id: 'security_opt_in', name: 'Security Opts', compatibleTypes: ['string_value'], multiple: true, color: '#718096' }, { id: 'prop:restart', name: 'Restart', compatibleTypes: ['env_value'], multiple: false, color: '#4299e1' }, { id: 'prop:user', name: 'User', compatibleTypes: ['env_value'], multiple: false, color: '#9f7aea' }, { id: 'prop:shm_size', name: 'SHM Size', compatibleTypes: ['env_value'], multiple: false, color: '#38b2ac' }, ],
        outputs: [ { id: 'service', name: 'Service', type: 'service', multiple: true, color: '#63b3ed' }, { id: 'portmap', name: 'Ports', type: 'portmap', multiple: true, color: '#f56565' }, ],
    };

    const rect = workspaceContainerRef.current.getBoundingClientRect();
    const x1 = (rect.width / 2 - (genericDef.defaultSize.width * GRID_SIZE) / 2 - transform.x) / transform.scale;
    const y1 = (rect.height / 2 - (genericDef.defaultSize.height * GRID_SIZE) / 2 - transform.y) / transform.scale;
    const x2 = x1 + genericDef.defaultSize.width * GRID_SIZE;
    const y2 = y1 + genericDef.defaultSize.height * GRID_SIZE;

    const newItem = { id: `item_${Date.now()}`, type: 'Container', definition: genericDef, coords: { x1, y1, x2, y2 }, data: { ...genericDef.defaultData, linkedInputs: {} } };
    setWorkspaceItems(items => [...items, newItem]);
    setIsAddContainerModalOpen(false);
  }, [workspaceItems, transform]);

  const { sidebarItemDefinitions, lsioApps } = useMemo(() => {
    const sidebarItems = {};
    const lsioItems = [];
    Object.keys(loadedItemData).forEach(key => {
      const itemDef = loadedItemData[key].definition;
      if (!itemDef) return;
      const isContainer = itemDef.inputs?.some(i => i.id === 'depends_on');
      if (isContainer) {
        lsioItems.push({ id: key, ...itemDef });
      } else if (key !== 'ColorBox' && key !== 'Container') { 
        sidebarItems[key] = loadedItemData[key];
      }
    });
    lsioItems.sort((a, b) => a.name.localeCompare(b.name));
    return { sidebarItemDefinitions: sidebarItems, lsioApps: lsioItems };
  }, [loadedItemData]);

  return (
    <div 
      className="app-container"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      style={{'--sidebar-width': isSidebarOpen ? '250px' : '0px'}}
    >
      <Sidebar
        onDragStartItem={handleDragStart}
        itemDefinitions={sidebarItemDefinitions}
        isOpen={isSidebarOpen}
        onToggleLsioModal={toggleLsioModal}
        onOpenAddContainerModal={() => setIsAddContainerModalOpen(true)}
      />
      <button
        className="sidebar-toggle"
        onClick={toggleSidebar}
        style={{ left: isSidebarOpen ? '250px' : '0px' }}
        aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      />
      <Workspace
        ref={workspaceContainerRef}
        items={workspaceItems}
        setItems={setWorkspaceItems}
        connections={connections}
        onConnectionMade={handleConnectionMade}
        transform={transform}
        onTransformChange={setTransform}
        itemComponents={loadedItemData}
        draggingItem={draggingItem}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        selectedElement={selectedElement}
        setSelectedElement={setSelectedElement}
        onItemDataChange={handleItemDataChange}
        onClearCanvasRequest={handleClearCanvasRequest}
        onGenerateComposeRequest={generateComposeFile}
      />
      <ConfirmationModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={confirmClearCanvas}
        title="Confirm Clear Canvas"
      >
        <p>Are you sure you want to clear the entire canvas? This action cannot be undone.</p>
      </ConfirmationModal>
      <ComposeModal
        isOpen={isComposeModalOpen}
        onClose={() => setIsComposeModalOpen(false)}
        composeFileContent={composeFileContent}
      />
      <LsioModal
        isOpen={isLsioModalOpen}
        onClose={() => setIsLsioModalOpen(false)}
        onDragStartItem={handleDragStart}
        lsioApps={lsioApps}
      />
      <AddContainerModal
        isOpen={isAddContainerModalOpen}
        onClose={() => setIsAddContainerModalOpen(false)}
        onConfirm={handleAddCustomContainer}
      />
    </div>
  );
}

export default App;
