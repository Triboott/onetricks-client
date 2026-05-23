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
  onGameStarted: (callback) => ipcRenderer.on('game-started', (event, data) => callback(data)),
  onGameEnded: (callback) => ipcRenderer.on('game-ended', (event, data) => callback(data)),
  onValorantStatus: (callback) => ipcRenderer.on('valorant-status', (event, data) => callback(data)),
  onValorantGameStarted: (callback) => ipcRenderer.on('valorant-game-started', (event, data) => callback(data)),
  onValorantGameEnded: (callback) => ipcRenderer.on('valorant-game-ended', (event) => callback()),
  
  // Auto-Updater Listeners from Main Process (Node.js) to Renderer Process (UI)
  onCheckingForUpdate: (callback) => ipcRenderer.on('checking-for-update', (event) => callback()),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, info) => callback(info)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (event, info) => callback(info)),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (event, err) => callback(err)),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, progressObj) => callback(progressObj)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, info) => callback(info)),
  
  // Triggers from Renderer Process (UI) to Main Process (Node.js)
  changeRole: (role) => ipcRenderer.send('change-role', role),
  pinRole: (role) => ipcRenderer.send('pin-role', role),
  applyBuild: (buildData) => ipcRenderer.send('apply-build', buildData),
  toggleAutoApply: (settings) => ipcRenderer.send('toggle-auto-apply', settings),
  saveCustomPath: (path) => ipcRenderer.send('save-custom-path', path),
  saveCustomValPath: (path) => ipcRenderer.send('save-custom-val-path', path),
  selectPath: (options) => ipcRenderer.invoke('select-path', options),
  getInitialState: () => ipcRenderer.invoke('get-initial-state'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  
  // Auto-Updater Actions
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  restartAndInstall: () => ipcRenderer.send('restart-and-install')
});
