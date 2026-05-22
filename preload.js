const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Listeners from Main Process (Node.js) to Renderer Process (UI)
  onLcuStatus: (callback) => ipcRenderer.on('lcu-status', (event, data) => callback(data)),
  onChampSelectUpdate: (callback) => ipcRenderer.on('champ-select-update', (event, data) => callback(data)),
  onScrapeProgress: (callback) => ipcRenderer.on('scrape-progress', (event, data) => callback(data)),
  onScrapeSuccess: (callback) => ipcRenderer.on('scrape-success', (event, data) => callback(data)),
  onScrapeError: (callback) => ipcRenderer.on('scrape-error', (event, data) => callback(data)),
  onDDragonReady: (callback) => ipcRenderer.on('ddragon-ready', (event, version) => callback(version)),
  onSkinUpdate: (callback) => ipcRenderer.on('skin-update', (event, data) => callback(data)),
  
  // Triggers from Renderer Process (UI) to Main Process (Node.js)
  changeRole: (role) => ipcRenderer.send('change-role', role),
  pinRole: (role) => ipcRenderer.send('pin-role', role),
  applyBuild: (buildData) => ipcRenderer.send('apply-build', buildData),
  toggleAutoApply: (settings) => ipcRenderer.send('toggle-auto-apply', settings),
  saveCustomPath: (path) => ipcRenderer.send('save-custom-path', path),
  getInitialState: () => ipcRenderer.invoke('get-initial-state'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeWindow: () => ipcRenderer.send('window-close')
});
