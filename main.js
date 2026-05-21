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
  customLoLPath: '',
  flashOnD: false,
  pinnedRole: 'default'
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
  } catch (e) {
    console.error('Failed to load config:', e);
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Failed to save config:', e);
  }
}

function applyFlashPreference(summoners) {
  if (!summoners || !summoners.raw) return summoners;

  const raw = { ...summoners.raw };
  const spell1 = { ...summoners.spell1 };
  const spell2 = { ...summoners.spell2 };

  const hasFlash = raw.spell1Id === 4 || raw.spell2Id === 4;
  if (hasFlash) {
    if (config.flashOnD) {
      // We want Flash on spell1 (D)
      if (raw.spell2Id === 4) {
        // Swap them
        const tempId = raw.spell1Id;
        raw.spell1Id = raw.spell2Id;
        raw.spell2Id = tempId;

        const tempSpell = { ...spell1 };
        summoners.spell1 = { ...spell2 };
        summoners.spell2 = tempSpell;
      }
    } else {
      // We want Flash on spell2 (F)
      if (raw.spell1Id === 4) {
        // Swap them
        const tempId = raw.spell1Id;
        raw.spell1Id = raw.spell2Id;
        raw.spell2Id = tempId;

        const tempSpell = { ...spell1 };
        summoners.spell1 = { ...spell2 };
        summoners.spell2 = tempSpell;
      }
    }
  }

  summoners.raw = raw;
  return summoners;
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
      console.log(`[CLIENT] LCU Status changed: ${status}`);
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
  console.log('[CLIENT] Champ Select session update:', session ? 'ACTIVE' : 'INACTIVE');
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

    // Auto-detect role from LCU session, but respect pinnedRole first
    let assignedRole = 'default';
    if (config.pinnedRole && config.pinnedRole !== 'default') {
      assignedRole = config.pinnedRole;
      console.log(`[CLIENT] Overriding LCU role with pinned role: ${assignedRole}`);
    } else if (player && player.assignedPosition) {
      const pos = player.assignedPosition.toLowerCase();
      if (pos === 'middle') assignedRole = 'mid';
      else if (pos === 'bottom') assignedRole = 'bot';
      else if (pos === 'utility') assignedRole = 'support';
      else if (['top', 'jungle'].includes(pos)) assignedRole = pos;
    }

    appState.activeRole = assignedRole;

    // Resolve Champion ID to Champion Name
    const champInfo = scraper.resolveChampionId(selectedChampId);
    appState.activeChampionName = champInfo.name;
    appState.activeChampionImage = champInfo.image;

    sendToRenderer('champ-select-update', {
      active: true,
      championId: selectedChampId,
      championName: champInfo.name,
      championDisplayName: champInfo.displayName,
      championImage: champInfo.image,
      role: appState.activeRole
    });

    // Start scraping runes & summoners
    triggerScrape(champInfo.name, appState.activeRole);
  }
}

// Scrape execution helper
async function triggerScrape(championName, role) {
  console.log(`[CLIENT] Triggering scrape for champion: ${championName}, role: ${role}`);
  const champInfo = Object.values(scraper.championsDict).find(c => c.name === championName) || { displayName: championName };
  const roleLabel = role !== 'default' ? ` (${role.toUpperCase()})` : '';
  
  sendToRenderer('scrape-progress', { 
    status: 'fetching', 
    message: `Obteniendo datos de Onetricks para ${champInfo.displayName}${roleLabel}...` 
  });

  try {
    const scraped = await scraper.scrapeRunesAndSummoners(championName, role);
    
    // Ensure we haven't switched champion/role during async wait
    if (appState.activeChampionName !== championName || appState.activeRole !== role) {
      return;
    }

    if (scraped && scraped.summoners) {
      scraped.summoners = applyFlashPreference(scraped.summoners);
    }

    appState.scrapedData = scraped;
    
    // Dynamically update activeRole to the champion's most popular role if it was default
    if (role === 'default' && scraped.role) {
      appState.activeRole = scraped.role;
    }

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
    sendToRenderer('scrape-error', { 
      message: `No se pudieron obtener las runas para ${role !== 'default' ? role.toUpperCase() : 'el rol principal'}.` 
    });
  }
}

// IPC Channels definitions
ipcMain.handle('get-initial-state', () => {
  return {
    appState,
    config
  };
});

ipcMain.on('change-role', async (event, newRole) => {
  appState.activeRole = newRole;
  if (appState.activeChampionId !== 0 && appState.activeChampionName) {
    triggerScrape(appState.activeChampionName, newRole);
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

ipcMain.on('toggle-auto-apply', (event, { autoApplyRunes, autoApplySpells, flashOnD }) => {
  config.autoApplyRunes = autoApplyRunes;
  config.autoApplySpells = autoApplySpells;
  if (flashOnD !== undefined) {
    config.flashOnD = flashOnD;
  }
  saveConfig();

  // In-session dynamic update for Flash preference!
  if (appState.scrapedData && appState.scrapedData.summoners) {
    appState.scrapedData.summoners = applyFlashPreference(appState.scrapedData.summoners);
    sendToRenderer('scrape-success', appState.scrapedData);

    if (config.autoApplySpells) {
      connector.applySummonerSpells(appState.scrapedData.summoners.raw).catch(err => {
        console.error('Failed to auto-apply summoner spells on toggle:', err);
      });
    }
  }
});

ipcMain.on('save-custom-path', (event, pathStr) => {
  config.customLoLPath = pathStr;
  saveConfig();
  if (connector) {
    connector.setCustomPath(pathStr);
  }
});

ipcMain.on('pin-role', (event, pinnedRole) => {
  config.pinnedRole = pinnedRole;
  saveConfig();
  console.log(`[CONFIG] Pinned role set to: ${pinnedRole}`);
});

// Custom window frames handlers
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});
