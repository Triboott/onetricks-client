const { app, BrowserWindow, ipcMain, shell, Tray, Menu, screen, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { exec, spawn } = require('child_process');
const LcuConnector = require('./lcu-connector');
const OnetricksScraper = require('./onetricks-scraper');
const ValorantConnector = require('./valorant-connector');

// Prevent crashes from unhandled LCU API/websocket promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err);
});

let mainWindow = null;
let overlayWindow = null; // transparent scoreboard overlay
let tabListenerProcess = null; // C# Tab key listener child process
let liveGamePollInterval = null; // live client data polling interval
let playerBootsCache = {}; // tracks each player's purchased boots item ID to handle dedicated quest slots
const BOOTS_IDS = new Set([
  '1001', '2422', // Tier 1
  '3005', '3006', '3008', '3009', '3010', '3013', '3020', '3047', '3111', '3117', '3158', // Tier 2
  '3168', '3170', '3171', '3173', '3174', '3175', '3176', // Tier 3
]);
let selectedCalibrationElement = 'header'; // tracks element currently selected for arrow keys
let isPreviewMode = false; // true while calibration preview is active
let isDraggingElement = false; // true while user is dragging header or lanes on the overlay in-game
let isCalibratingMode = false; // true when user holds Ctrl + Tab to calibrate in-game using arrow keys
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
  lang: 'en',
  enableGoldOverlay: true,
  overlayOffsetX: 996,
  overlayOffsetY: 1462,
  headerOffsetX: 0,
  headerOffsetY: 0,
  columnOffsetX: 545,
  columnOffsetY: 1182,
  row0OffsetX: 0,
  row0OffsetY: 0,
  row1OffsetX: 0,
  row1OffsetY: 0,
  row2OffsetX: 0,
  row2OffsetY: 0,
  row3OffsetX: 0,
  row3OffsetY: 0,
  row4OffsetX: 0,
  row4OffsetY: 0
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
// Force CPU saving / Low Performance mode to be always enabled
config.enableLowPerf = true;

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

// ==========================================================================
// SCOREBOARD GOLD OVERLAY HELPER FUNCTIONS & COMPILATION
// ==========================================================================
function compileTabListener() {
  // In a packaged app, the exe lives in process.resourcesPath (outside the ASAR).
  // In dev mode it lives in scratch/.
  const isPackaged = app.isPackaged;
  const csPath  = isPackaged
    ? path.join(process.resourcesPath, 'tab_listener.cs')
    : path.join(__dirname, 'scratch', 'tab_listener.cs');
  const exePath = isPackaged
    ? path.join(process.resourcesPath, 'tab_listener.exe')
    : path.join(__dirname, 'scratch', 'tab_listener.exe');

  if (!fs.existsSync(csPath)) {
    console.log('[OVERLAY] C# listener file missing. Skipping compilation.');
    return;
  }

  // Compile if EXE doesn't exist OR the CS file is newer than the EXE
  let shouldCompile = true;
  if (fs.existsSync(exePath)) {
    const csStats = fs.statSync(csPath);
    const exeStats = fs.statSync(exePath);
    if (exeStats.mtimeMs > csStats.mtimeMs) {
      shouldCompile = false;
    }
  }

  if (!shouldCompile) {
    console.log('[OVERLAY] tab_listener.exe is up to date.');
    return;
  }

  console.log('[OVERLAY] Compiling tab_listener.cs...');
  const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
  if (!fs.existsSync(cscPath)) {
    console.error('[OVERLAY] csc.exe not found! Cannot compile C# Tab listener.');
    return;
  }

  const cmd = `"${cscPath}" /out:"${exePath}" "${csPath}"`;
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error('[OVERLAY] Compilation failed:', err, stderr);
    } else {
      console.log('[OVERLAY] Compiled tab_listener.exe successfully.');
    }
  });
}

function createOverlayWindow(isCalibration = false) {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    // If the focusable state is different from what we want, destroy it first so we can recreate it
    if (overlayWindow.focusable !== isCalibration) {
      overlayWindow.destroy();
      overlayWindow = null;
    } else {
      return;
    }
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.bounds;

  overlayWindow = new BrowserWindow({
    x: x,
    y: y,
    width: width,
    height: height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: isCalibration, // focusable during calibration preview so drag-and-drop works flawlessly!
    show: false, // Hidden by default, toggled via Tab key listener
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  overlayWindow.focusable = isCalibration; // Store focusable state as custom property

  // Make the window click-through but forward mouse events so JS hover works
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.setAlwaysOnTop(true, 'screen-saver'); // Force overlay above full-screen/borderless game

  overlayWindow.loadFile(path.join(__dirname, 'overlay.html'));

  overlayWindow.webContents.on('console-message', (event, level, message) => {
    console.log(`[OVERLAY CONSOLE] ${message}`);
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

const getOffsetsPayload = () => {
  const globalX = config.overlayOffsetX || 0;
  const globalY = config.overlayOffsetY || 0;
  return {
    globalX,
    globalY,
    headerX: config.headerOffsetX !== undefined ? config.headerOffsetX : globalX,
    headerY: config.headerOffsetY !== undefined ? config.headerOffsetY : globalY,
    columnX: config.columnOffsetX !== undefined ? config.columnOffsetX : globalX,
    columnY: config.columnOffsetY !== undefined ? config.columnOffsetY : globalY,
    row0X: config.row0OffsetX !== undefined ? config.row0OffsetX : globalX,
    row0Y: config.row0OffsetY !== undefined ? config.row0OffsetY : globalY,
    row1X: config.row1OffsetX !== undefined ? config.row1OffsetX : globalX,
    row1Y: config.row1OffsetY !== undefined ? config.row1OffsetY : globalY,
    row2X: config.row2OffsetX !== undefined ? config.row2OffsetX : globalX,
    row2Y: config.row2OffsetY !== undefined ? config.row2OffsetY : globalY,
    row3X: config.row3OffsetX !== undefined ? config.row3OffsetX : globalX,
    row3Y: config.row3OffsetY !== undefined ? config.row3OffsetY : globalY,
    row4X: config.row4OffsetX !== undefined ? config.row4OffsetX : globalX,
    row4Y: config.row4OffsetY !== undefined ? config.row4OffsetY : globalY
  };
};

function handleTabListenerLine(line) {
  if (line.startsWith('SELECT ')) {
    const num = parseInt(line.substring(7), 10) || 0;
    if (num === 0) selectedCalibrationElement = 'header';
    else selectedCalibrationElement = 'row' + (num - 1);
    
    if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
      overlayWindow.webContents.send('select-element', selectedCalibrationElement);
    }
  } else if (line.startsWith('DRAG ')) {
    if (isDraggingElement) return; // Skip shifting elements if user is manually dragging one!
    
    // Check global cursor position to ignore player reordering drags in-game
    const cursor = screen.getCursorScreenPoint();
    const primaryDisplay = screen.getPrimaryDisplay();
    const W = primaryDisplay.bounds.width;
    const scoreboardCenter = (W / 2) + (config.overlayOffsetX || 0);
    
    // Clicks on the outer left/right halves (player rows) are ignored.
    // Clicks in the center scoreboard area (CS/matchups column) are treated as scoreboard drags.
    if (Math.abs(cursor.x - scoreboardCenter) > W * 0.08) {
      return;
    }
    
    const parts = line.split(' ');
    const dx = parseInt(parts[1], 10) || 0;
    const dy = parseInt(parts[2], 10) || 0;
    
    config.overlayOffsetX = (config.overlayOffsetX || 0) + dx;
    config.overlayOffsetY = (config.overlayOffsetY || 0) + dy;
    config.headerOffsetX = (config.headerOffsetX !== undefined ? config.headerOffsetX : (config.overlayOffsetX - dx)) + dx;
    config.headerOffsetY = (config.headerOffsetY !== undefined ? config.headerOffsetY : (config.overlayOffsetY - dy)) + dy;
    config.columnOffsetX = (config.columnOffsetX !== undefined ? config.columnOffsetX : (config.overlayOffsetX - dx)) + dx;
    config.columnOffsetY = (config.columnOffsetY !== undefined ? config.columnOffsetY : (config.overlayOffsetY - dy)) + dy;
    
    for (let i = 0; i < 5; i++) {
      const rx = 'row' + i + 'OffsetX';
      const ry = 'row' + i + 'OffsetY';
      config[rx] = (config[rx] !== undefined ? config[rx] : (config.overlayOffsetX - dx)) + dx;
      config[ry] = (config[ry] !== undefined ? config[ry] : (config.overlayOffsetY - dy)) + dy;
    }
    
    saveConfig();
    
    if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
      overlayWindow.webContents.send('update-offsets', getOffsetsPayload());
    }
  } else if (line.startsWith('CAL_')) {
    const dir = line.substring(4);
    const step = 4; // Move by 4px steps
    let dx = 0, dy = 0;
    if (dir === 'UP') dy = -step;
    else if (dir === 'DOWN') dy = step;
    else if (dir === 'LEFT') dx = -step;
    else if (dir === 'RIGHT') dx = step;

    if (selectedCalibrationElement === 'header') {
      config.headerOffsetX = (config.headerOffsetX !== undefined ? config.headerOffsetX : (config.overlayOffsetX || 0)) + dx;
      config.headerOffsetY = (config.headerOffsetY !== undefined ? config.headerOffsetY : (config.overlayOffsetY || 0)) + dy;
    } else {
      const rowKeyX = selectedCalibrationElement + 'OffsetX';
      const rowKeyY = selectedCalibrationElement + 'OffsetY';
      config[rowKeyX] = (config[rowKeyX] !== undefined ? config[rowKeyX] : (config.overlayOffsetX || 0)) + dx;
      config[rowKeyY] = (config[rowKeyY] !== undefined ? config[rowKeyY] : (config.overlayOffsetY || 0)) + dy;
    }
    
    saveConfig();
    
    if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
      overlayWindow.webContents.send('update-offsets', getOffsetsPayload());
    }
  } else if (line === 'CALIBRATION_ON') {
    isCalibratingMode = true;
    if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
      overlayWindow.webContents.send('select-element', selectedCalibrationElement);
    }
  } else if (line === 'CALIBRATION_OFF') {
    isCalibratingMode = false;
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('select-element', null);
    }
  } else if (overlayWindow && !overlayWindow.isDestroyed()) {
    if (line === 'DOWN') {
      overlayWindow.setIgnoreMouseEvents(true, { forward: true });
      overlayWindow.webContents.send('update-offsets', getOffsetsPayload());
      // Reset visual selection when opening scoreboard (only if calibrating!)
      overlayWindow.webContents.send('select-element', isCalibratingMode ? selectedCalibrationElement : null);
      
      // Dynamic screen bounds adjustment in case of resolution changes!
      try {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { x, y, width, height } = primaryDisplay.bounds;
        overlayWindow.setBounds({ x, y, width, height });
      } catch (err) {
        console.error('[OVERLAY] Failed to dynamically update bounds on Tab:', err);
      }

      overlayWindow.setAlwaysOnTop(true, 'screen-saver'); // Pull overlay to the top of the z-order above the fullscreen game!
      overlayWindow.showInactive(); // Show without stealing focus
    } else if (line === 'UP') {
      overlayWindow.hide();
      isCalibratingMode = false;
      overlayWindow.webContents.send('select-element', null);
    }
  }
}

function restartTabListener() {
  if (tabListenerProcess) {
    try {
      const pid = tabListenerProcess.pid;
      exec(`taskkill /pid ${pid} /f /t`);
    } catch (e) {
      try {
        tabListenerProcess.kill();
      } catch (err) {}
    }
    tabListenerProcess = null;
  }

  // Resolve the exe path: use resourcesPath when packaged, scratch/ in dev
  const exePath = app.isPackaged
    ? path.join(process.resourcesPath, 'tab_listener.exe')
    : path.join(__dirname, 'scratch', 'tab_listener.exe');
  if (fs.existsSync(exePath)) {
    try {
      tabListenerProcess = spawn(exePath);
      console.log('[OVERLAY] Spawned tab_listener.exe process.');

      tabListenerProcess.stdout.on('data', (data) => {
        const str = data.toString();
        const lines = str.split(/\r?\n/);
        for (let rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;
          handleTabListenerLine(line);
        }
      });

      tabListenerProcess.on('error', (err) => {
        console.error('[OVERLAY] Tab listener process error:', err.message);
      });

      tabListenerProcess.on('close', (code) => {
        console.log(`[OVERLAY] Tab listener process exited with code ${code}`);
        tabListenerProcess = null;
      });
    } catch (e) {
      console.error('[OVERLAY] Failed to spawn tab_listener.exe:', e);
    }
  }
}

function startLiveGameTracking() {
  stopLiveGameTracking();

  if (config.enableGoldOverlay === false) {
    console.log('[OVERLAY] Gold overlay is disabled in settings. Skipping tracking.');
    return;
  }

  console.log('[OVERLAY] Starting live game overlay tracking...');
  
  // Start polling the Live Client Data API (overlay window & tab listener will be spawned once game API responds successfully)
  liveGamePollInterval = setInterval(pollLiveClientData, 1500);
  pollLiveClientData(); // Immediate poll
}

function stopLiveGameTracking() {
  console.log('[OVERLAY] Stopping live game overlay tracking...');
  playerBootsCache = {};

  if (liveGamePollInterval) {
    clearInterval(liveGamePollInterval);
    liveGamePollInterval = null;
  }

  if (tabListenerProcess) {
    try {
      const pid = tabListenerProcess.pid;
      exec(`taskkill /pid ${pid} /f /t`);
    } catch (e) {
      try {
        tabListenerProcess.kill();
      } catch (err) {}
    }
    tabListenerProcess = null;
  }

  // Forceful fail-safe cleanup of any loose tab_listener processes on Windows
  try {
    exec('taskkill /f /im tab_listener.exe');
  } catch (e) {}

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
    overlayWindow = null;
  }
}

function pollLiveClientData() {
  // Phase-guard: ignore polling if not in an active game phase
  if (!['GameStart', 'InProgress', 'Reconnect'].includes(appState.currentGameflowPhase)) {
    return;
  }

  const options = {
    hostname: '127.0.0.1',
    port: 2999,
    path: '/liveclientdata/allgamedata',
    method: 'GET',
    rejectUnauthorized: false, // Bypass self-signed SSL cert check
    timeout: 1000
  };

  const req = https.request(options, (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      try {
        if (res.statusCode !== 200) return;
        const data = JSON.parse(rawData);
        processLiveGameGoldData(data);
      } catch (err) {
        // Parsing issues, safe to ignore during fast polling
      }
    });
  });

  req.on('error', (err) => {
    // API not ready or loading, safe to ignore
  });
  req.on('timeout', () => {
    req.destroy();
  });
  req.end();
}

function processLiveGameGoldData(data) {
  if (!data || !data.allPlayers || data.allPlayers.length === 0) return;
  if (!scraper || !scraper.itemsMap) return;

  // Spawn the C# global input hook process only when the game client's live API is fully active,
  // and the match has actually started (gameTime > 0), to ensure it sits at the top of the hook chain
  // after the game client has completed its startup and input/window initialization!
  const gameTime = data.gameData ? data.gameData.gameTime : 0;
  if (!tabListenerProcess && gameTime > 0) {
    console.log(`[OVERLAY] Live game active (gameTime: ${gameTime}). Creating overlay window & spawning tab listener...`);
    
    // Create the overlay window now when the game is fully loaded and active!
    // This completely prevents Chromium background suspension and guarantees it sits on top in the z-order!
    createOverlayWindow();
    
    restartTabListener();
  }

  const activeSummonerName = data.activePlayer && data.activePlayer.summonerName;
  const me = data.allPlayers.find(p => p.summonerName === activeSummonerName);
  const myTeam = me ? me.team : 'ORDER'; // Fallback to ORDER if activePlayer not ready

  // Filter players into Allies vs Enemies
  const allies = data.allPlayers.filter(p => p.team === myTeam);
  const enemies = data.allPlayers.filter(p => p.team !== myTeam);

  // Calculate spent gold value from active items
  const calculatePlayerGold = (player) => {
    if (!player.items || !Array.isArray(player.items)) return 0;
    
    let hasBoots = false;
    let gold = player.items.reduce((sum, item) => {
      const id = String(item.itemID);
      const count = item.count || 1;
      
      if (BOOTS_IDS.has(id)) {
        hasBoots = true;
        playerBootsCache[player.summonerName] = id;
      }
      
      const itemCost = scraper.itemsMap[id] ? scraper.itemsMap[id].gold : 0;
      return sum + (itemCost * count);
    }, 0);

    // If the player has completed their role quest, their boots will be in the dedicated quest slot,
    // which may be omitted from the player.items array by the local Live Client API.
    // In this case, we manually add their cached boots' gold cost to their total spent gold!
    if (!hasBoots && playerBootsCache[player.summonerName]) {
      const cachedId = playerBootsCache[player.summonerName];
      let bootCost = scraper.itemsMap[cachedId] ? scraper.itemsMap[cachedId].gold : 0;
      if (bootCost === 0) {
        const fallbackCosts = {
          '1001': 300,  // Boots
          '2422': 300,  // Slightly Magical Footwear
          '3005': 1000, // Ghostly Explorers
          '3006': 1100, // Berserker's Greaves
          '3008': 1000, // Greedy Greaves
          '3009': 1000, // Boots of Swiftness
          '3010': 900,  // Symbiotic Soles
          '3013': 900,  // Synchronized Souls
          '3020': 1100, // Sorcerer's Shoes
          '3047': 1200, // Plated Steelcaps
          '3111': 1250, // Mercury's Treads
          '3117': 1000, // Boots of Mobility
          '3158': 900,  // Ionian Boots of Lucidity
          '3168': 1000, // Immortal Path
          '3170': 1000, // Swift March
          '3171': 900,  // Crimson Lucidity
          '3173': 1250, // Chain Wrecker
          '3174': 1200, // Armored Advance
          '3175': 1100, // Spellcaster's Boots
          '3176': 900,  // Eternal Advance
        };
        bootCost = fallbackCosts[cachedId] || 0;
      }
      gold += bootCost;
    }

    return gold;
  };

  let alliesTotalGold = 0;
  let enemiesTotalGold = 0;

  const alliesGoldInfo = allies.map(p => {
    const gold = calculatePlayerGold(p);
    alliesTotalGold += gold;
    return {
      summonerName: p.summonerName,
      championName: p.championName,
      gold: gold
    };
  });

  const enemiesGoldInfo = enemies.map(p => {
    const gold = calculatePlayerGold(p);
    enemiesTotalGold += gold;
    return {
      summonerName: p.summonerName,
      championName: p.championName,
      gold: gold
    };
  });

  // Calculate team difference
  const teamGoldDifference = alliesTotalGold - enemiesTotalGold;

  // Align matchups by role index (allies[i] vs enemies[i] in standard scoreboard role order)
  const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
  const matchups = [];
  const len = Math.min(alliesGoldInfo.length, enemiesGoldInfo.length, 5);

  for (let i = 0; i < len; i++) {
    const ally = alliesGoldInfo[i];
    const enemy = enemiesGoldInfo[i];
    const role = roles[i] || 'UNKNOWN';

    matchups.push({
      role: role,
      allyChampion: ally.championName,
      enemyChampion: enemy.championName,
      allyGold: ally.gold,
      enemyGold: enemy.gold,
      difference: ally.gold - enemy.gold
    });
  }

  const payload = {
    ddragonVersion: scraper.ddragonVersion,
    lang: config.lang || 'en',
    alliesTotalGold,
    enemiesTotalGold,
    teamGoldDifference,
    matchups
  };

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('update-gold', payload);
  }
}

app.whenReady().then(() => {
  createWindow();
  compileTabListener();
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
    autoUpdater.checkForUpdates().catch(() => {});
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
      
      // Stop LoL detection ONLY when actual match is in progress (not pre-game agent select)
      if (gameData && !gameData.isPregame) {
        if (connector) {
          console.log('[CLIENT] Valorant active match in progress. Stopping LoL detection to save CPU.');
          connector.stop();
          sendToRenderer('lcu-status', {
            status: 'disconnected',
            config,
            playerInfo: null,
            ddragonVersion: scraper ? scraper.ddragonVersion : '14.10.1'
          });
        }
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
    stopLiveGameTracking();
    
    // Resume Valorant detection if enabled in config
    if (config.enableValorantDetection !== false && valorantConnector) {
      console.log('[CLIENT] LoL game ended. Resuming Valorant detection.');
      valorantConnector.start();
    }
  } else if (['GameStart', 'InProgress', 'Reconnect'].includes(phase)) {
    console.log(`[CLIENT] Game active/started (Phase: ${phase}). Fetching players info...`);
    startLiveGameTracking();
    
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

ipcMain.on('dragging-state-change', (event, state) => {
  isDraggingElement = state;
});

ipcMain.on('save-element-offset', (event, { type, x, y }) => {
  if (type === 'header') {
    config.headerOffsetX = x;
    config.headerOffsetY = y;
  } else if (type === 'column') {
    config.columnOffsetX = x;
    config.columnOffsetY = y;
  } else if (type.startsWith('row')) {
    const rx = type + 'OffsetX';
    const ry = type + 'OffsetY';
    config[rx] = x;
    config[ry] = y;
  }
  saveConfig();
});

ipcMain.on('preview-overlay', (event) => {
  createOverlayWindow(true);
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    const getOffsetsPayload = () => {
      const globalX = config.overlayOffsetX || 0;
      const globalY = config.overlayOffsetY || 0;
      return {
        globalX, globalY,
        headerX: config.headerOffsetX !== undefined ? config.headerOffsetX : globalX,
        headerY: config.headerOffsetY !== undefined ? config.headerOffsetY : globalY,
        columnX: config.columnOffsetX !== undefined ? config.columnOffsetX : globalX,
        columnY: config.columnOffsetY !== undefined ? config.columnOffsetY : globalY,
        row0X: config.row0OffsetX !== undefined ? config.row0OffsetX : globalX,
        row0Y: config.row0OffsetY !== undefined ? config.row0OffsetY : globalY,
        row1X: config.row1OffsetX !== undefined ? config.row1OffsetX : globalX,
        row1Y: config.row1OffsetY !== undefined ? config.row1OffsetY : globalY,
        row2X: config.row2OffsetX !== undefined ? config.row2OffsetX : globalX,
        row2Y: config.row2OffsetY !== undefined ? config.row2OffsetY : globalY,
        row3X: config.row3OffsetX !== undefined ? config.row3OffsetX : globalX,
        row3Y: config.row3OffsetY !== undefined ? config.row3OffsetY : globalY,
        row4X: config.row4OffsetX !== undefined ? config.row4OffsetX : globalX,
        row4Y: config.row4OffsetY !== undefined ? config.row4OffsetY : globalY
      };
    };

    const fakeGold = {
      alliesTotalGold: 12450, enemiesTotalGold: 10820,
      teamGoldDifference: 1630,
      matchups: [
        { role: 'TOP',     allyGold: 2500, enemyGold: 2100, difference: 400 },
        { role: 'JUNGLE',  allyGold: 2800, enemyGold: 2300, difference: 500 },
        { role: 'MID',     allyGold: 2650, enemyGold: 2700, difference: -50 },
        { role: 'ADC',     allyGold: 2700, enemyGold: 2100, difference: 600 },
        { role: 'SUPPORT', allyGold: 1800, enemyGold: 1620, difference: 180 }
      ]
    };

    isPreviewMode = true;

    // CRITICAL: In preview/calibration mode, the overlay MUST receive mouse events
    // so the user can drag elements. setIgnoreMouseEvents(false) enables this.
    overlayWindow.setIgnoreMouseEvents(false);

    const sendPreviewData = () => {
      overlayWindow.webContents.send('update-offsets', getOffsetsPayload());
      overlayWindow.webContents.send('update-gold', fakeGold);
      overlayWindow.webContents.send('start-preview');
    };

    if (overlayWindow.webContents.isLoading()) {
      // Page is still loading — wait for it to finish
      overlayWindow.webContents.once('did-finish-load', sendPreviewData);
    } else {
      // Page is already loaded — send immediately
      sendPreviewData();
    }

    // show() + focus() so the window actually gets mouse input on Windows
    overlayWindow.show();
    overlayWindow.focus();
  }
});

ipcMain.on('end-preview', () => {
  isPreviewMode = false;
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('end-preview');
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    overlayWindow.hide();
  }
  createOverlayWindow(false);
  // Notify the main renderer so it can uncheck the preview toggle
  sendToRenderer('preview-ended');
});

ipcMain.on('set-click-through', (event, ignore) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setIgnoreMouseEvents(ignore, { forward: true });
  }
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

ipcMain.on('toggle-auto-apply', (event, { autoApplyRunes, autoApplySpells, autoApplyItems, flashOnD, debugBrowser, startAtLogin, enableSounds, enableLolDetection, enableValorantDetection, zoomFactor, enableLowPerf, lang, enableGoldOverlay }) => {
  const flashPreferenceChanged = (flashOnD !== undefined && flashOnD !== config.flashOnD);
  const lolDetectionChanged = (enableLolDetection !== undefined && enableLolDetection !== config.enableLolDetection);
  const valDetectionChanged = (enableValorantDetection !== undefined && enableValorantDetection !== config.enableValorantDetection);
  const zoomChanged = (zoomFactor !== undefined && zoomFactor !== config.zoomFactor);
  const goldOverlayChanged = (enableGoldOverlay !== undefined && enableGoldOverlay !== config.enableGoldOverlay);

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
  if (enableGoldOverlay !== undefined) {
    config.enableGoldOverlay = enableGoldOverlay;
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

  // If gold overlay setting changed dynamically during an active game
  if (goldOverlayChanged) {
    if (['GameStart', 'InProgress', 'Reconnect'].includes(appState.currentGameflowPhase)) {
      if (config.enableGoldOverlay) {
        startLiveGameTracking();
      } else {
        stopLiveGameTracking();
      }
    }
  }

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

