const { app, BrowserWindow, ipcMain, shell, Tray, Menu, screen, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const LcuConnector = require('./lcu-connector');
const OnetricksScraper = require('./onetricks-scraper');
const ValorantConnector = require('./valorant-connector');

let mainWindow = null;
let connector = null;
let valorantConnector = null;
let scraper = null;
let tray = null;
let isQuitting = false;

// Request single instance lock to prevent duplicate app windows
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', (event, commandLine, workingDirectory) => {
  // Bring the already running instance to the front
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

// Default configuration settings
let config = {
  autoApplyRunes: true,
  autoApplySpells: true,
  autoApplyItems: true,
  customLoLPath: '',
  customValPath: '',
  flashOnD: true,
  debugBrowser: false,
  pinnedRole: 'default',
  startAtLogin: false,
  enableSounds: true,
  enableLolDetection: true,
  enableValorantDetection: true,
  zoomFactor: 1.0,
  enableLowPerf: true,
  lang: 'en'
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
  scrapedData: null,
  activeGame: null,
  valorantStatus: 'disconnected', // 'disconnected', 'scanning', 'connected'
  activeValorantGame: null,
  valorantPlayerInfo: null
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
      
      let soloQ = ranked && ranked.queues && ranked.queues.find(q => q.queueType === 'RANKED_SOLO_5x5');
      if (!soloQ && ranked && ranked.queueMap) {
        soloQ = ranked.queueMap['RANKED_SOLO_5x5'] || ranked.queueMap['RANKED_SOLO_5x5_CURRENT'] || ranked.queueMap.RANKED_SOLO_5x5;
      }
      
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

async function fetchActiveGamePlayersInfo() {
  if (!connector || connector.status !== 'connected') return null;
  
  try {
    const session = await connector.request('GET', '/lol-gameflow/v1/session');
    if (!session || !session.gameData) {
      console.log('[CLIENT] Active game session not found or gameData is missing');
      return null;
    }

    const { teamOne, teamTwo } = session.gameData;
    
    const fetchTeamPlayers = async (team) => {
      if (!team) return [];
      const players = [];
      for (const p of team) {
        try {
          const puuid = p.puuid;
          if (!puuid && !p.summonerId) continue;
          
          // Fetch summoner details (to get gameName, tagLine, level, and profileIconId)
          let gameName = p.summonerName || '';
          let tagLine = '';
          let profileIconId = null;
          let summonerLevel = 1;
          let fetchedSummoner = null;
          
          if (puuid) {
            try {
              fetchedSummoner = await connector.request('GET', `/lol-summoner/v2/summoners/puuid/${puuid}`);
            } catch (e) {
              console.warn(`[CLIENT] Failed to fetch summoner by PUUID ${puuid}:`, e.message);
            }
          }
          
          if (!fetchedSummoner && p.summonerId) {
            try {
              fetchedSummoner = await connector.request('GET', `/lol-summoner/v1/summoners/${p.summonerId}`);
            } catch (e) {
              console.warn(`[CLIENT] Failed to fetch summoner by ID ${p.summonerId}:`, e.message);
            }
          }
          
          if (fetchedSummoner) {
            gameName = fetchedSummoner.gameName || fetchedSummoner.displayName || p.summonerName || '';
            tagLine = fetchedSummoner.tagLine || '';
            profileIconId = fetchedSummoner.profileIconId || 1;
            summonerLevel = fetchedSummoner.summonerLevel || 1;
          }
          
          // Fetch ranked stats
          let tier = 'UNRANKED';
          let division = '';
          let lp = 0;
          let wins = 0;
          let losses = 0;
          let winrate = 0;
          
          const statsLookupPuuid = puuid || (fetchedSummoner && fetchedSummoner.puuid);
          if (statsLookupPuuid) {
            try {
              const ranked = await connector.request('GET', `/lol-ranked/v1/ranked-stats/${statsLookupPuuid}`);
              let soloQ = ranked && ranked.queues && ranked.queues.find(q => q.queueType === 'RANKED_SOLO_5x5');
              if (!soloQ && ranked && ranked.queueMap) {
                soloQ = ranked.queueMap['RANKED_SOLO_5x5'] || ranked.queueMap['RANKED_SOLO_5x5_CURRENT'] || ranked.queueMap.RANKED_SOLO_5x5;
              }
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
            } catch (e) {
              console.warn(`[CLIENT] Failed to fetch ranked stats for PUUID ${statsLookupPuuid}:`, e.message);
            }
          }

          // Resolve champion details
          let champInfo = { name: 'Unknown', displayName: 'Desconocido', image: '' };
          if (p.championId) {
            champInfo = scraper.resolveChampionId(p.championId);
          }

          let displayName = gameName;
          if (gameName && tagLine) {
            displayName = `${gameName}#${tagLine}`;
          }

          players.push({
            puuid: puuid || (fetchedSummoner && fetchedSummoner.puuid) || '',
            summonerId: p.summonerId,
            displayName,
            gameName,
            tagLine,
            profileIconId,
            summonerLevel,
            championId: p.championId,
            championName: champInfo.name,
            championDisplayName: champInfo.displayName,
            championImage: champInfo.image,
            tier,
            division,
            lp,
            wins,
            losses,
            winrate
          });
        } catch (err) {
          console.error('[CLIENT] Error building active game player profile:', err);
        }
      }
      return players;
    };

    const blueTeam = await fetchTeamPlayers(teamOne);
    const redTeam = await fetchTeamPlayers(teamTwo);

    return {
      gameId: session.gameData.gameId,
      blueTeam,
      redTeam
    };
  } catch (err) {
    console.error('[CLIENT] Failed to fetch active game players info:', err);
    return null;
  }
}

function createWindow() {
  const shouldStartHidden = process.argv.includes('--hidden');
  
  // Dynamically obtain screen dimensions to scale for low-resolution displays
  const primaryDisplay = screen.getPrimaryDisplay();
  const { height: scrHeight } = primaryDisplay.workAreaSize;
  
  let winWidth = 1280;
  let winHeight = 800;
  
  // Scale down beautifully if running on lower vertical resolution screens (e.g. 1366x768)
  if (scrHeight <= 768) {
    winWidth = 1180;
    winHeight = 680;
  }

  // Apply saved zoom factor multiplier to the window size on startup!
  const initialZoom = config.zoomFactor !== undefined ? config.zoomFactor : 1.0;
  winWidth = Math.round(winWidth * initialZoom);
  winHeight = Math.round(winHeight * initialZoom);

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
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

  // Disable spellcheck on main window session to save RAM
  mainWindow.webContents.session.setSpellCheckerEnabled(false);

  // Disable system native application menu completely to save CPU and RAM
  Menu.setApplicationMenu(null);

  mainWindow.loadFile('index.html');

  // Set initial zoom factor after loading the page
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setZoomFactor(config.zoomFactor || 1.0);
  });

  // Intercept window close event to hide window instead of destroying it
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (connector) connector.setThrottled(true);
      if (valorantConnector) valorantConnector.setThrottled(true);
    }
  });

  mainWindow.on('minimize', () => {
    if (connector) connector.setThrottled(true);
    if (valorantConnector) valorantConnector.setThrottled(true);
  });

  mainWindow.on('restore', () => {
    if (connector) connector.setThrottled(false);
    if (valorantConnector) valorantConnector.setThrottled(false);
  });

  mainWindow.on('hide', () => {
    if (connector) connector.setThrottled(true);
    if (valorantConnector) valorantConnector.setThrottled(true);
  });

  mainWindow.on('show', () => {
    if (connector) connector.setThrottled(false);
    if (valorantConnector) valorantConnector.setThrottled(false);
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

  rebuildTrayMenu();

  // Double click tray icon to restore application window
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function rebuildTrayMenu() {
  if (!tray) return;
  const isEn = config.lang === 'en';
  const showLabel = isEn ? 'Show Onetricks' : 'Mostrar Onetricks';
  const quitLabel = isEn ? 'Quit' : 'Salir';

  const contextMenu = Menu.buildFromTemplate([
    {
      label: showLabel,
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: quitLabel,
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Onetricks Client');
  tray.setContextMenu(contextMenu);
}

// ==========================================================================
// ELECTRON AUTO-UPDATER CONFIGURATION & EVENTS
// ==========================================================================
function setupAutoUpdater() {
  autoUpdater.autoDownload = true; // Auto-download when found
  
  if (!app.isPackaged) {
    autoUpdater.forceDevUpdateConfig = true;
  }
  
  autoUpdater.on('checking-for-update', () => {
    console.log('[UPDATER] Checking for update...');
    sendToRenderer('checking-for-update');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[UPDATER] Update available:', info);
    sendToRenderer('update-available', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[UPDATER] Update not available:', info);
    sendToRenderer('update-not-available', info);
  });

  autoUpdater.on('error', (err) => {
    console.error('[UPDATER] Error in auto-updater:', err);
    sendToRenderer('update-error', err ? err.message : 'Error desconocido');
  });

  autoUpdater.on('download-progress', (progressObj) => {
    sendToRenderer('download-progress', {
      percent: Math.round(progressObj.percent),
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[UPDATER] Update downloaded:', info);
    sendToRenderer('update-downloaded', info);
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  updateLoginItemSettings();
  setupAutoUpdater();

  // Check for updates on startup (after 5 seconds)
  setTimeout(() => {
    console.log('[UPDATER] Initial update check...');
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      console.warn('[UPDATER] Initial update check failed:', err.message);
    });
  }, 5000);

  // Check for updates periodically every 2 hours while the app is running
  setInterval(() => {
    console.log('[UPDATER] Periodic update check...');
    autoUpdater.checkForUpdates().catch(err => {
      console.warn('[UPDATER] Periodic update check failed:', err.message);
    });
  }, 2 * 60 * 60 * 1000);

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
        if (playerInfo) {
          config.lastLolProfile = playerInfo;
          saveConfig();
        }
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

  // Start scanning for LoL only if enabled
  if (config.enableLolDetection !== false) {
    connector.start();
  } else {
    appState.lcuStatus = 'disconnected';
  }

  // Instantiate and Start Valorant Connector
  valorantConnector = new ValorantConnector({
    customPath: config.customValPath,
    onStatusChange: async (status) => {
      console.log(`[CLIENT] Valorant Status changed: ${status}`);
      appState.valorantStatus = status;
      let valPlayerInfo = null;
      if (status === 'connected') {
        valPlayerInfo = await valorantConnector.getLocalPlayerProfile();
        appState.valorantPlayerInfo = valPlayerInfo;
        if (valPlayerInfo) {
          config.lastValProfile = valPlayerInfo;
          saveConfig();
        }
      } else {
        appState.valorantPlayerInfo = null;
      }
      sendToRenderer('valorant-status', { status, playerInfo: valPlayerInfo, config });
    },
    onGameStarted: (gameData) => {
      console.log(`[CLIENT] Valorant Game started! Dispatched event to renderer.`);
      appState.activeValorantGame = gameData;
      sendToRenderer('valorant-game-started', gameData);
      
      // Stop LoL detection when Valorant match starts to save CPU
      if (connector) {
        console.log('[CLIENT] Valorant game started. Stopping LoL detection to save CPU.');
        connector.stop();
        sendToRenderer('lcu-status', {
          status: 'disconnected',
          config,
          playerInfo: null,
          ddragonVersion: scraper ? scraper.ddragonVersion : '14.10.1'
        });
      }
    },
    onGameEnded: () => {
      console.log(`[CLIENT] Valorant Game ended! Dispatched event to renderer.`);
      appState.activeValorantGame = null;
      sendToRenderer('valorant-game-ended');
      
      // Resume LoL detection if enabled in config
      if (config.enableLolDetection !== false && connector) {
        console.log('[CLIENT] Valorant game ended. Resuming LoL detection.');
        connector.start();
      }
    }
  });
  
  // Start scanning for Valorant only if enabled
  if (config.enableValorantDetection !== false) {
    valorantConnector.start();
  } else {
    appState.valorantStatus = 'disconnected';
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  if (valorantConnector) valorantConnector.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (connector) connector.stop();
    if (valorantConnector) valorantConnector.stop();
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

async function checkAndTriggerActiveGameBuildScrape(activeGame) {
  if (!activeGame || !connector || connector.status !== 'connected') return;
  try {
    const currentSummoner = await connector.getCurrentSummoner();
    if (!currentSummoner) return;
    const myPuuid = currentSummoner.puuid;
    const mySummonerId = currentSummoner.summonerId;
    const myName = (currentSummoner.gameName || currentSummoner.displayName || '').toLowerCase().trim();

    const me = activeGame.blueTeam.find(p => {
      if (myPuuid && p.puuid === myPuuid) return true;
      if (mySummonerId && p.summonerId === mySummonerId) return true;
      if (myName) {
        const pName = (p.gameName || p.displayName || '').toLowerCase().trim();
        return pName.includes(myName) || myName.includes(pName);
      }
      return false;
    }) || activeGame.redTeam.find(p => {
      if (myPuuid && p.puuid === myPuuid) return true;
      if (mySummonerId && p.summonerId === mySummonerId) return true;
      if (myName) {
        const pName = (p.gameName || p.displayName || '').toLowerCase().trim();
        return pName.includes(myName) || myName.includes(pName);
      }
      return false;
    });

    if (me && me.championName && me.championName !== 'Unknown') {
      console.log(`[CLIENT] Active player found in game playing ${me.championName}. Triggering automatic build scrape...`);
      appState.activeChampionName = me.championName;
      appState.activeChampionId = me.championId;
      
      let targetRole = 'default';
      if (appState.activeRole && appState.activeRole !== 'default') {
        targetRole = appState.activeRole;
        console.log(`[CLIENT] Preserving active role: ${targetRole}`);
      } else if (config && config.pinnedRole && config.pinnedRole !== 'default') {
        targetRole = config.pinnedRole;
        console.log(`[CLIENT] Using pinned role: ${targetRole}`);
      }
      
      appState.activeRole = targetRole;
      triggerScrape(me.championName, targetRole);
    } else {
      console.log('[CLIENT] Active player not found in current game team rosters or champion is unknown.');
    }
  } catch (err) {
    console.error('[CLIENT] Failed to trigger build scrape for active player in game:', err);
  }
}

// Handler for LCU Gameflow Phase updates
function handleGameflowPhaseUpdate(phase) {
  console.log(`[CLIENT] LCU Gameflow Phase updated: ${phase}`);
  appState.currentGameflowPhase = phase;

  // Reset workspace if gameflow returns to non-active phase (lobby, none, dodged, ended)
  const resetPhases = ['None', 'Lobby', 'Matchmaking', 'ReadyCheck', 'EndOfGame', 'WaitingForStats'];
  if (resetPhases.includes(phase)) {
    appState.activeGame = null;
    resetWorkspace();
    sendToRenderer('game-ended', {});
    
    // Resume Valorant detection if enabled in config
    if (config.enableValorantDetection !== false && valorantConnector) {
      console.log('[CLIENT] LoL game ended. Resuming Valorant detection.');
      valorantConnector.start();
    }
  } else if (['GameStart', 'InProgress', 'Reconnect'].includes(phase)) {
    console.log(`[CLIENT] Game active/started (Phase: ${phase}). Fetching players info...`);
    
    // Stop Valorant detection when LoL match starts to save CPU
    if (valorantConnector) {
      console.log('[CLIENT] LoL game active. Stopping Valorant detection to save CPU.');
      valorantConnector.stop();
      sendToRenderer('valorant-status', { status: 'disconnected', playerInfo: null });
    }
    
    // Wait a brief moment to ensure LCU game session is fully instantiated
    setTimeout(async () => {
      // Confirm that the phase hasn't changed back to a reset phase in the meantime
      if (['GameStart', 'InProgress', 'Reconnect'].includes(appState.currentGameflowPhase)) {
        const activeGame = await fetchActiveGamePlayersInfo();
        if (activeGame) {
          appState.activeGame = activeGame;
          sendToRenderer('game-started', activeGame);
          console.log(`[CLIENT] Compiled active game info and dispatched 'game-started' event to renderer. Allied players: ${activeGame.blueTeam.length}, Enemy players: ${activeGame.redTeam.length}`);
          await checkAndTriggerActiveGameBuildScrape(activeGame);
        }
      }
    }, 2000);
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

  // Focus window when champion select is active, but only if it's not in the background (hidden or minimized)
  if (mainWindow) {
    const isBackground = !mainWindow.isVisible() || mainWindow.isMinimized();
    if (!isBackground) {
      mainWindow.focus();
    } else {
      console.log('[CLIENT] App is in the background (hidden or minimized). Keeping it in the background as requested.');
    }
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

    // Resolve skin number asynchronously to handle chromas mapping to parent skins
    scraper.resolveSkinNumber(champInfo.name, selectedSkinId).then(resolvedSkinNumber => {
      sendToRenderer('champ-select-update', {
        active: true,
        championId: selectedChampId,
        championName: champInfo.name,
        championDisplayName: champInfo.displayName,
        championImage: champInfo.image,
        role: appState.activeRole,
        skinId: selectedSkinId,
        resolvedSkinNumber: resolvedSkinNumber,
        ddragonVersion: scraper.ddragonVersion
      });
    }).catch(err => {
      console.error('Error resolving skin number:', err);
      sendToRenderer('champ-select-update', {
        active: true,
        championId: selectedChampId,
        championName: champInfo.name,
        championDisplayName: champInfo.displayName,
        championImage: champInfo.image,
        role: appState.activeRole,
        skinId: selectedSkinId,
        resolvedSkinNumber: selectedSkinId ? (selectedSkinId % 1000) : 0,
        ddragonVersion: scraper.ddragonVersion
      });
    });

    // Start scraping runes & summoners
    triggerScrape(champInfo.name, appState.activeRole);
  } else if (selectedChampId !== 0 && selectedSkinId !== appState.activeSkinId) {
    // If the champion is identical but the skin changed
    appState.activeSkinId = selectedSkinId;
    console.log(`[CLIENT] Champion skin changed to ID: ${selectedSkinId}`);
    
    scraper.resolveSkinNumber(appState.activeChampionName, selectedSkinId).then(resolvedSkinNumber => {
      sendToRenderer('skin-update', { skinId: selectedSkinId, resolvedSkinNumber: resolvedSkinNumber });
    }).catch(err => {
      console.error('Error resolving skin number on change:', err);
      sendToRenderer('skin-update', { skinId: selectedSkinId, resolvedSkinNumber: selectedSkinId ? (selectedSkinId % 1000) : 0 });
    });
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
      console.log(`[CLIENT] Auto-applying item set. startingBuild=${scraped.items.startingBuild?.length}, coreItems=${scraped.items.coreItems?.length}, recommendedItems=${scraped.items.recommendedItems?.length}`);
      await connector.applyItemSet(appState.activeChampionId, appState.activeChampionName, scraped.items);
    } else {
      console.log(`[CLIENT] Skipping item set. autoApplyItems=${config.autoApplyItems}, hasItems=${!!scraped.items}`);
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
    if (playerInfo) {
      config.lastLolProfile = playerInfo;
      saveConfig();
    }
    // If game is active, let's fetch in-game info too!
    if (['GameStart', 'InProgress', 'Reconnect'].includes(appState.currentGameflowPhase)) {
      appState.activeGame = await fetchActiveGamePlayersInfo();
      if (appState.activeGame) {
        checkAndTriggerActiveGameBuildScrape(appState.activeGame);
      }
    }
  }
  let valorantPlayerInfo = null;
  if (valorantConnector && valorantConnector.status === 'connected') {
    valorantPlayerInfo = await valorantConnector.getLocalPlayerProfile();
    appState.valorantPlayerInfo = valorantPlayerInfo;
    if (valorantPlayerInfo) {
      config.lastValProfile = valorantPlayerInfo;
      saveConfig();
    }
  }
  return {
    appState,
    config,
    ddragonVersion: scraper ? scraper.ddragonVersion : '14.10.1',
    playerInfo,
    valorantPlayerInfo,
    version: app.getVersion()
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

ipcMain.on('toggle-auto-apply', (event, { autoApplyRunes, autoApplySpells, autoApplyItems, flashOnD, debugBrowser, startAtLogin, enableSounds, enableLolDetection, enableValorantDetection, zoomFactor, enableLowPerf, lang }) => {
  const flashPreferenceChanged = (flashOnD !== undefined && flashOnD !== config.flashOnD);
  const lolDetectionChanged = (enableLolDetection !== undefined && enableLolDetection !== config.enableLolDetection);
  const valDetectionChanged = (enableValorantDetection !== undefined && enableValorantDetection !== config.enableValorantDetection);
  const zoomChanged = (zoomFactor !== undefined && zoomFactor !== config.zoomFactor);

  if (lang !== undefined && lang !== config.lang) {
    config.lang = lang;
    rebuildTrayMenu();
  }

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
  if (enableLowPerf !== undefined) {
    config.enableLowPerf = enableLowPerf;
  }
  if (enableLolDetection !== undefined) {
    config.enableLolDetection = enableLolDetection;
  }
  if (enableValorantDetection !== undefined) {
    config.enableValorantDetection = enableValorantDetection;
  }
  if (zoomFactor !== undefined) {
    const sanitizedZoom = Math.min(Math.max(zoomFactor, 0.7), 1.3);
    config.zoomFactor = sanitizedZoom;
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.webContents.setZoomFactor(sanitizedZoom);

        // Dynamically scale and resize the BrowserWindow itself!
        const primaryDisplay = screen.getPrimaryDisplay();
        const { height: scrHeight } = primaryDisplay.workAreaSize;

        let baseWidth = 1280;
        let baseHeight = 800;

        if (scrHeight <= 768) {
          baseWidth = 1180;
          baseHeight = 680;
        }

        const newWidth = Math.round(baseWidth * sanitizedZoom);
        const newHeight = Math.round(baseHeight * sanitizedZoom);

        // Defensive Electron sizing wrapper for Windows borderless windows
        mainWindow.setResizable(true);
        mainWindow.setSize(newWidth, newHeight);
        mainWindow.setResizable(false);
        mainWindow.center(); // Center the window so it remains perfectly placed on screen

        console.log(`[CONFIG] Zoom level updated dynamically to ${sanitizedZoom} and window resized to ${newWidth}x${newHeight}`);
      } catch (err) {
        console.error('Failed to set zoom level dynamically and resize:', err);
      }
    }
  }
  saveConfig();

  // If LoL detection status changed dynamically
  if (lolDetectionChanged) {
    if (config.enableLolDetection) {
      console.log('[CONFIG] Enabling LoL detection dynamically');
      if (connector) connector.start();
    } else {
      console.log('[CONFIG] Disabling LoL detection dynamically');
      if (connector) {
        connector.stop();
        appState.lcuStatus = 'disconnected';
        appState.activeGame = null;
        resetWorkspace();
        sendToRenderer('lcu-status', {
          status: 'disconnected',
          config,
          playerInfo: null,
          ddragonVersion: scraper ? scraper.ddragonVersion : '14.10.1'
        });
      }
    }
  }

  // If Valorant detection status changed dynamically
  if (valDetectionChanged) {
    if (config.enableValorantDetection) {
      console.log('[CONFIG] Enabling Valorant detection dynamically');
      if (valorantConnector) valorantConnector.start();
    } else {
      console.log('[CONFIG] Disabling Valorant detection dynamically');
      if (valorantConnector) {
        valorantConnector.stop();
        appState.valorantStatus = 'disconnected';
        appState.activeValorantGame = null;
        appState.valorantPlayerInfo = null;
        sendToRenderer('valorant-status', { status: 'disconnected', playerInfo: null });
        sendToRenderer('valorant-game-ended');
      }
    }
  }

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

ipcMain.on('save-custom-val-path', (event, pathStr) => {
  config.customValPath = pathStr;
  saveConfig();
  if (valorantConnector) {
    valorantConnector.setCustomPath(pathStr);
  }
});

ipcMain.handle('select-path', async (event, { title, defaultPath }) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: title || 'Seleccionar Ubicación',
    properties: ['openDirectory', 'openFile'],
    defaultPath: defaultPath || undefined
  });
  
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
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

// Auto-updater control handlers
ipcMain.on('check-for-updates', () => {
  console.log('[UPDATER] Manual check requested by renderer');
  autoUpdater.checkForUpdates().catch(err => {
    console.error('[UPDATER] Failed manual update check:', err);
    sendToRenderer('update-error', err ? err.message : 'Error desconocido');
  });
});

ipcMain.on('restart-and-install', () => {
  console.log('[UPDATER] Restart and install requested by renderer');
  autoUpdater.quitAndInstall();
});

