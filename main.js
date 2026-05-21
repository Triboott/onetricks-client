const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const LcuConnector = require('./lcu-connector');
const OnetricksScraper = require('./onetricks-scraper');

let mainWindow = null;
let connector = null;
let scraper = null;

// Default configuration settings
let config = {
  autoApplyRunes: true,
  autoApplySpells: true,
  customLoLPath: '',//miguel angel doblado galveeez
};

// Global application state
let appState = {
  lcuStatus: 'disconnected', // 'disconnected', 'scanning', 'connected'
  activeChampionId: 0,
  activeChampionName: '',
  activeChampionImage: '',
  activeRole: 'default', // e.g. 'TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'
  scrapedData: null
};

// Load configuration
const configPath = path.join(app.getPath('userData'), 'config.json');
if (fs.existsSync(configPath)) {
  try {
    config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
    console.log('[MAIN] Config loaded successfully from:', configPath, config);
  } catch (e) {
    console.error('Failed to load config:', e);
  }
} else {
  console.log('[MAIN] No config file found at:', configPath, '. Using default config:', config);
}

function saveConfig() {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Failed to save config:', e);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    frame: false, // Borderless for premium custom header
    resizable: false,
    transparent: false,
    backgroundColor: '#0d0e12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  // Instantiate Modules
  scraper = new OnetricksScraper(mainWindow);
  connector = new LcuConnector({
    customPath: config.customLoLPath,
    onStatusChange: (status) => {
      appState.lcuStatus = status;
      sendToRenderer('lcu-status', { status, config });
    },
    onChampSelectUpdate: handleChampSelectUpdate
  });

  // Start scanning for LoL
  connector.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (connector) connector.stop();
    app.quit();
  }
});

// Helper to broadcast events to renderer
function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// Logic to process champion selection in Champion Select
async function handleChampSelectUpdate(session) {
  if (!session) {
    // Reset state if no longer in champ select
    if (appState.activeChampionId !== 0) {
      appState.activeChampionId = 0;
      appState.activeChampionName = '';
      appState.activeChampionImage = '';
      appState.activeRole = 'default';
      appState.scrapedData = null;
      sendToRenderer('champ-select-update', { active: false });
    }
    return;
  }

  // Find current player cell ID
  const localPlayerCellId = session.localPlayerCellId;
  const activeAction = session.actions.flatMap(a => a).find(a => a.actorCellId === localPlayerCellId && a.isInProgress);

  // Find player's selected champion
  const player = session.myTeam.find(p => p.cellId === localPlayerCellId);
  let selectedChampId = 0;

  if (player) {
    selectedChampId = player.championId || player.hoveredChampionId || 0;
  }

  if (selectedChampId === 0 && activeAction) {
    selectedChampId = activeAction.championId || 0;
  }

  // If champion has changed
  if (selectedChampId !== appState.activeChampionId) {
    appState.activeChampionId = selectedChampId;

    if (selectedChampId === 0) {
      appState.activeChampionName = '';
      appState.activeChampionImage = '';
      appState.activeRole = 'default';
      appState.scrapedData = null;
      sendToRenderer('champ-select-update', { active: true, championId: 0 });
      return;
    }

    // Resolve Champion ID to Champion Name
    const champInfo = scraper.resolveChampionId(selectedChampId);
    appState.activeChampionName = champInfo.name;
    appState.activeChampionImage = champInfo.image;

    // Detect assigned position from LCU and map to onetricks roles
    const positionMap = {
      'top': 'top',
      'jungle': 'jungle',
      'middle': 'mid',
      'bottom': 'bot',
      'utility': 'support'
    };
    const assignedPosition = (player && player.assignedPosition) ? player.assignedPosition.toLowerCase() : '';
    const detectedRole = positionMap[assignedPosition] || 'default';
    appState.activeRole = detectedRole;

    sendToRenderer('champ-select-update', {
      active: true,
      championId: selectedChampId,
      championName: champInfo.name,
      championDisplayName: champInfo.displayName,
      championImage: champInfo.image,
      activeRole: detectedRole
    });

    // Start scraping runes & summoners for the detected role
    sendToRenderer('scrape-progress', { status: 'fetching', message: `Obteniendo datos de Onetricks para ${champInfo.displayName}...` });

    try {
      const scraped = await scraper.scrapeRunesAndSummoners(champInfo.name, detectedRole);
      appState.scrapedData = scraped;
      sendToRenderer('scrape-success', scraped);

      // Auto-apply if configured
      if (config.autoApplyRunes && scraped.runes) {
        await connector.applyRunes(scraped.runes.raw);
      }
      if (config.autoApplySpells && scraped.summoners) {
        await connector.applySummonerSpells(scraped.summoners.raw);
      }
    } catch (err) {
      console.error('Scraping error:', err);
      sendToRenderer('scrape-error', { message: 'No se pudieron obtener las runas automáticamente.' });
    }
  }
}

// IPC Channels definitions
ipcMain.handle('get-initial-state', () => {
  return {
    appState,
    config,
    champions: scraper ? scraper.championsDict : {}
  };
});

ipcMain.on('simulate-champion', async (event, { id }) => {
  // Force active champion selection simulated
  appState.activeChampionId = id;
  const champInfo = scraper.resolveChampionId(id);
  appState.activeChampionName = champInfo.name;
  appState.activeChampionImage = champInfo.image;
  appState.activeRole = 'default';
  appState.scrapedData = null;

  console.log(`[MAIN] [SIMULACIÓN] Iniciada simulación para: ${champInfo.displayName} (ID: ${id})`);

  sendToRenderer('champ-select-update', {
    active: true,
    championId: id,
    championName: champInfo.name,
    championDisplayName: champInfo.displayName,
    championImage: champInfo.image,
    activeRole: 'default'
  });

  sendToRenderer('scrape-progress', { 
    status: 'fetching', 
    message: `[Simulación] Obteniendo datos de Onetricks para ${champInfo.displayName}...` 
  });

  try {
    const scraped = await scraper.scrapeRunesAndSummoners(champInfo.name, 'default');
    appState.scrapedData = scraped;
    sendToRenderer('scrape-success', scraped);

    // Auto-apply if configured
    if (config.autoApplyRunes && scraped.runes) {
      try {
        await connector.applyRunes(scraped.runes.raw);
      } catch (e) {
        console.error('[MAIN] [SIMULACIÓN] Error al auto-aplicar runas:', e.message);
      }
    }
    if (config.autoApplySpells && scraped.summoners) {
      try {
        await connector.applySummonerSpells(scraped.summoners.raw);
      } catch (e) {
        console.error('[MAIN] [SIMULACIÓN] Error al auto-aplicar hechizos:', e.message);
      }
    }
  } catch (err) {
    console.error('[MAIN] [SIMULACIÓN] Error de scraping:', err);
    sendToRenderer('scrape-error', { message: 'No se pudieron obtener las runas automáticamente para el campeón simulado.' });
  }
});

ipcMain.on('apply-build', async (event, data) => {
  if (!connector) return;
  try {
    if (data.runes) {
      await connector.applyRunes(data.runes);
    }
    if (data.summoners) {
      await connector.applySummonerSpells(data.summoners);
    }
  } catch (err) {
    console.error('Manual apply error:', err);
  }
});

ipcMain.on('change-role', async (event, role) => {
  if (appState.activeChampionId === 0) return;

  appState.activeRole = role;
  sendToRenderer('scrape-progress', { status: 'fetching', message: `Actualizando a rol ${role.toUpperCase()} en Onetricks...` });

  try {
    const scraped = await scraper.scrapeRunesAndSummoners(appState.activeChampionName, role);
    appState.scrapedData = scraped;
    sendToRenderer('scrape-success', scraped);

    // Auto-apply if configured
    if (config.autoApplyRunes && scraped.runes) {
      await connector.applyRunes(scraped.runes.raw);
    }
    if (config.autoApplySpells && scraped.summoners) {
      await connector.applySummonerSpells(scraped.summoners.raw);
    }
  } catch (err) {
    console.error('Manual change-role scraping error:', err);
    sendToRenderer('scrape-error', { message: 'No se pudieron obtener las runas para el rol seleccionado.' });
  }
});

ipcMain.on('toggle-auto-apply', (event, { autoApplyRunes, autoApplySpells }) => {
  config.autoApplyRunes = autoApplyRunes;
  config.autoApplySpells = autoApplySpells;
  saveConfig();
});

ipcMain.on('save-custom-path', (event, pathStr) => {
  config.customLoLPath = pathStr;
  saveConfig();
  if (connector) {
    connector.setCustomPath(pathStr);
  }
});

// Custom window frames handlers
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});
