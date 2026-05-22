const { app, BrowserWindow, ipcMain, shell, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const LcuConnector = require('./lcu-connector');
const OnetricksScraper = require('./onetricks-scraper');

let mainWindow = null;
let connector = null;
let scraper = null;
let tray = null;
let isQuitting = false;

// Default configuration settings
let config = {
  autoApplyRunes: true,
  autoApplySpells: true,
  autoApplyItems: true,
  customLoLPath: '',
  flashOnD: false,
  debugBrowser: false,
  pinnedRole: 'default',
  startAtLogin: false,
  enableSounds: true
};

// Global application state
let appState = {
  lcuStatus: 'disconnected', // 'disconnected', 'scanning', 'connected'
  currentGameflowPhase: 'None',
  activeChampionId: 0,
  activeSkinId: 0,
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

function updateLoginItemSettings() {
  try {
    app.setLoginItemSettings({
      openAtLogin: !!config.startAtLogin,
      openAsHidden: true,
      path: app.isPackaged ? process.execPath : undefined,
      args: ['--hidden']
    });
    console.log(`[CONFIG] login item settings updated: openAtLogin = ${config.startAtLogin}`);
  } catch (err) {
    console.warn('[CONFIG] Failed to set login item settings:', err.message);
  }
}

function applyFlashPreference(summoners) {
  if (!summoners || !summoners.raw) return summoners;

  const result = {
    ...summoners,
    raw: { ...summoners.raw },
    spell1: { ...summoners.spell1 },
    spell2: { ...summoners.spell2 }
  };

  const hasFlash = result.raw.spell1Id === 4 || result.raw.spell2Id === 4;
  if (hasFlash) {
    if (config.flashOnD) {
      // We want Flash on spell1 (D)
      if (result.raw.spell2Id === 4) {
        // Swap them
        const tempId = result.raw.spell1Id;
        result.raw.spell1Id = result.raw.spell2Id;
        result.raw.spell2Id = tempId;

        const tempSpell = result.spell1;
        result.spell1 = result.spell2;
        result.spell2 = tempSpell;
      }
    } else {
      // We want Flash on spell2 (F)
      if (result.raw.spell1Id === 4) {
        // Swap them
        const tempId = result.raw.spell1Id;
        result.raw.spell1Id = result.raw.spell2Id;
        result.raw.spell2Id = tempId;

        const tempSpell = result.spell1;
        result.spell1 = result.spell2;
        result.spell2 = tempSpell;
      }
    }
  }

  return result;
}

async function fetchPlayerInfo(retries = 3) {
  if (!connector || connector.status !== 'connected') return null;
  
  for (let i = 0; i < retries; i++) {
    try {
      const summoner = await connector.getCurrentSummoner();
      if (!summoner || (!summoner.displayName && !summoner.gameName)) {
        // If summoner isn't fully ready, wait and retry
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }
      
      const ranked = await connector.getRankedStats();
      
      const soloQ = ranked && ranked.queues && ranked.queues.find(q => q.queueType === 'RANKED_SOLO_5x5');
      
      let tier = 'UNRANKED';
      let division = '';
      let lp = 0;
      let wins = 0;
      let losses = 0;
      let winrate = 0;
      
      if (soloQ) {
        tier = soloQ.tier || 'UNRANKED';
        division = soloQ.division || '';
        lp = soloQ.leaguePoints || 0;
        wins = soloQ.wins || 0;
        losses = soloQ.losses || 0;
        
        const totalGames = wins + losses;
        if (totalGames > 0) {
          winrate = Math.round((wins / totalGames) * 100);
        }
      }
      
      const rawDisplayName = summoner.displayName || summoner.gameName || 'Summoner';
      const gameName = summoner.gameName || '';
      const tagLine = summoner.tagLine || '';
      
      let displayName = rawDisplayName;
      if (gameName && tagLine) {
        displayName = `${gameName}#${tagLine}`;
      } else if (rawDisplayName && !rawDisplayName.includes('#') && tagLine) {
        displayName = `${rawDisplayName}#${tagLine}`;
      }
      
      return {
        displayName,
        gameName,
        tagLine,
        profileIconId: summoner.profileIconId || 1,
        summonerLevel: summoner.summonerLevel || 1,
        tier,
        division,
        lp,
        wins,
        losses,
        winrate
      };
    } catch (err) {
      console.warn(`[CLIENT] Failed fetch player info attempt ${i + 1}/${retries}:`, err.message);
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  }
  return null;
}

function createWindow() {
  const shouldStartHidden = process.argv.includes('--hidden');
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: !shouldStartHidden,
    icon: path.join(__dirname, 'app_icon.png'), // Beautiful transparent vector rendering icon
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

  // Intercept window close event to hide window instead of destroying it
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Create and configure System Tray icon and menu
function createTray() {
  const iconPath = path.join(__dirname, 'tray_icon.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mostrar Onetricks',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Onetricks Client');
  tray.setContextMenu(contextMenu);

  // Double click tray icon to restore application window
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  updateLoginItemSettings();

  // Instantiate Modules
  scraper = new OnetricksScraper(mainWindow);
  connector = new LcuConnector({
    customPath: config.customLoLPath,
    onStatusChange: async (status) => {
      console.log(`[CLIENT] LCU Status changed: ${status}`);
      appState.lcuStatus = status;
      let playerInfo = null;
      if (status === 'connected') {
        playerInfo = await fetchPlayerInfo();
      }
      sendToRenderer('lcu-status', {
        status,
        config,
        playerInfo,
        ddragonVersion: scraper ? scraper.ddragonVersion : '14.10.1'
      });
    },
    onChampSelectUpdate: handleChampSelectUpdate,
    onGameflowPhaseUpdate: handleGameflowPhaseUpdate
  });

  // Start scanning for LoL
  connector.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
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

// Reset workspace and notify the renderer to transition back to the Welcome screen
function resetWorkspace() {
  if (appState.activeChampionId !== 0) {
    console.log('[CLIENT] Resetting workspace back to Welcome screen.');
    appState.activeChampionId = 0;
    appState.activeSkinId = 0;
    appState.activeChampionName = '';
    appState.activeChampionImage = '';
    appState.activeRole = 'default';
    appState.scrapedData = null;
    sendToRenderer('champ-select-update', { active: false });
  }
}

// Handler for LCU Gameflow Phase updates
function handleGameflowPhaseUpdate(phase) {
  console.log(`[CLIENT] LCU Gameflow Phase updated: ${phase}`);
  appState.currentGameflowPhase = phase;

  // Reset workspace if gameflow returns to non-active phase (lobby, none, dodged, ended)
  const resetPhases = ['None', 'Lobby', 'Matchmaking', 'ReadyCheck', 'EndOfGame', 'WaitingForStats'];
  if (resetPhases.includes(phase)) {
    resetWorkspace();
  }
}

// Logic to process champion selection in Champion Select
async function handleChampSelectUpdate(session) {
  console.log('[CLIENT] Champ Select session update:', session ? 'ACTIVE' : 'INACTIVE');
  if (!session) {
    // Delay to let LCU phase update (resolves race condition when transitioning into game)
    setTimeout(() => {
      const resetPhases = ['None', 'Lobby', 'Matchmaking', 'ReadyCheck', 'EndOfGame', 'WaitingForStats'];
      if (resetPhases.includes(appState.currentGameflowPhase)) {
        console.log(`[CLIENT] Champ select ended and game is not active (Phase: ${appState.currentGameflowPhase}). Resetting workspace.`);
        resetWorkspace();
      } else {
        console.log(`[CLIENT] Champ select ended but game is active/starting (Phase: ${appState.currentGameflowPhase}). Keeping build screen open.`);
      }
    }, 1500);
    return;
  }

  // Auto-restore and focus window when champion select is active
  if (mainWindow) {
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }

  // Find current player cell ID
  const localPlayerCellId = session.localPlayerCellId;
  const actions = session.actions ? session.actions.flatMap(a => a) : [];
  const activeAction = actions.find(a => a.actorCellId === localPlayerCellId && a.isInProgress);
  
  // A ban is active if either the player is currently executing a ban action,
  // or if there are any incomplete ban actions in the session.
  const isBanning = (activeAction && activeAction.type === 'ban') ||
                    actions.some(a => a.type === 'ban' && !a.completed);

  // Find player's selected champion
  const player = session.myTeam.find(p => p.cellId === localPlayerCellId);
  let selectedChampId = 0;
  const selectedSkinId = player ? (player.selectedSkinId || 0) : 0;

  if (!isBanning) {
    if (player) {
      selectedChampId = player.championId || player.hoveredChampionId || 0;
    }

    if (selectedChampId === 0 && activeAction) {
      selectedChampId = activeAction.championId || 0;
    }
  }

  // If champion has changed
  if (selectedChampId !== appState.activeChampionId) {
    appState.activeChampionId = selectedChampId;
    appState.activeSkinId = selectedSkinId;

    if (selectedChampId === 0) {
      appState.activeChampionName = '';
      appState.activeChampionImage = '';
      appState.activeRole = 'default';
      appState.scrapedData = null;
      sendToRenderer('champ-select-update', { active: true, championId: 0, skinId: 0 });
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
      role: appState.activeRole,
      skinId: selectedSkinId,
      ddragonVersion: scraper.ddragonVersion
    });

    // Start scraping runes & summoners
    triggerScrape(champInfo.name, appState.activeRole);
  } else if (selectedChampId !== 0 && selectedSkinId !== appState.activeSkinId) {
    // If the champion is identical but the skin changed
    appState.activeSkinId = selectedSkinId;
    console.log(`[CLIENT] Champion skin changed to ID: ${selectedSkinId}`);
    sendToRenderer('skin-update', { skinId: selectedSkinId });
  }
}

// Scrape execution helper
async function triggerScrape(championName, role) {
  console.log(`[CLIENT] Triggering scrape for champion: ${championName}, role: ${role}`);
  const champInfo = Object.values(scraper.championsDict).find(c => c.name === championName) || { displayName: championName };
  const roleLabel = role !== 'default' ? ` (${role.toUpperCase()})` : '';
  
  sendToRenderer('scrape-progress', { 
    status: 'fetching', 
    message: `Obteniendo datos de ${champInfo.displayName}${roleLabel}...` 
  });

  try {
    const scraped = await scraper.scrapeRunesAndSummoners(championName, role, config.debugBrowser);
    
    // Ensure we haven't switched champion/role during async wait
    if (appState.activeChampionName !== championName || appState.activeRole !== role) {
      return;
    }

    if (scraped) {
      if (scraped.summoners) {
        scraped.summoners = applyFlashPreference(scraped.summoners);
      }
      if (scraped.summonersOptions) {
        scraped.summonersOptions = scraped.summonersOptions.map(opt => applyFlashPreference(opt));
      }
    }

    appState.scrapedData = scraped;
    
    // Dynamically update activeRole to the champion's most popular role if it was default
    if (role === 'default' && scraped.role) {
      appState.activeRole = scraped.role;
    }

    if (scraped && scraper) {
      scraped.ddragonVersion = scraper.ddragonVersion;
    }

    sendToRenderer('scrape-success', scraped);

    // Auto-apply if configured
    if (config.autoApplyRunes && scraped.runes) {
      await connector.applyRunes(scraped.runes.raw);
    }
    if (config.autoApplySpells && scraped.summoners) {
      await connector.applySummonerSpells(scraped.summoners.raw);
    }
    if (config.autoApplyItems && scraped.items) {
      await connector.applyItemSet(appState.activeChampionId, appState.activeChampionName, scraped.items);
    }
  } catch (err) {
    console.error('Scraping error:', err);
    sendToRenderer('scrape-error', { 
      message: `No se pudieron obtener las runas para ${role !== 'default' ? role.toUpperCase() : 'el rol principal'}.` 
    });
  }
}

// IPC Channels definitions
ipcMain.handle('get-initial-state', async () => {
  let playerInfo = null;
  if (connector && connector.status === 'connected') {
    playerInfo = await fetchPlayerInfo();
  }
  return {
    appState,
    config,
    ddragonVersion: scraper ? scraper.ddragonVersion : '14.10.1',
    playerInfo
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
      if (appState.scrapedData) {
        const matchingOpt = appState.scrapedData.summonersOptions && appState.scrapedData.summonersOptions.find(
          opt => opt.raw.spell1Id === data.summoners.spell1Id && opt.raw.spell2Id === data.summoners.spell2Id
        );
        if (matchingOpt) {
          appState.scrapedData.summoners = matchingOpt;
        }
      }
      await connector.applySummonerSpells(data.summoners);
    }
    if (data.items) {
      await connector.applyItemSet(appState.activeChampionId, appState.activeChampionName, data.items);
    }
  } catch (err) {
    console.error('Manual apply error:', err);
  }
});

ipcMain.on('toggle-auto-apply', (event, { autoApplyRunes, autoApplySpells, autoApplyItems, flashOnD, debugBrowser, startAtLogin, enableSounds }) => {
  const flashPreferenceChanged = (flashOnD !== undefined && flashOnD !== config.flashOnD);

  config.autoApplyRunes = autoApplyRunes;
  config.autoApplySpells = autoApplySpells;
  if (autoApplyItems !== undefined) {
    config.autoApplyItems = autoApplyItems;
  }
  if (flashOnD !== undefined) {
    config.flashOnD = flashOnD;
  }
  if (debugBrowser !== undefined) {
    config.debugBrowser = debugBrowser;
  }
  if (startAtLogin !== undefined) {
    config.startAtLogin = startAtLogin;
    updateLoginItemSettings();
  }
  if (enableSounds !== undefined) {
    config.enableSounds = enableSounds;
  }
  saveConfig();

  // In-session dynamic update for Flash preference!
  if (appState.scrapedData) {
    if (flashPreferenceChanged) {
      if (appState.scrapedData.summoners) {
        appState.scrapedData.summoners = applyFlashPreference(appState.scrapedData.summoners);
      }
      if (appState.scrapedData.summonersOptions) {
        appState.scrapedData.summonersOptions = appState.scrapedData.summonersOptions.map(opt => applyFlashPreference(opt));
      }
      
      sendToRenderer('scrape-success', appState.scrapedData);
    }

    if (config.autoApplySpells && appState.scrapedData.summoners) {
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
