// ==========================================================================
// PROGRAMMATIC WEB AUDIO SOUND EFFECTS SYNTH ENGINE
// ==========================================================================
const sfx = {
  ctx: null,

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },

  playTick() {
    this.init();
    if (!this.ctx || (appConfig && appConfig.enableSounds === false)) return;
    const now = this.ctx.currentTime;

    // Low body thump (triangle wave sweep, 160Hz -> 80Hz)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.012);

    oscGain.gain.setValueAtTime(0.015, now);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    // High switch click transient (5ms bandpass-filtered noise burst around 2.8kHz)
    try {
      const bufferSize = this.ctx.sampleRate * 0.005; // 5ms
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2800, now);
      filter.Q.setValueAtTime(4, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.008, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.005);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.005);
    } catch (e) {
      console.warn("Click noise transient skipped:", e);
    }

    osc.start(now);
    osc.stop(now + 0.012);
  },

  playSwitch() {
    this.init();
    if (!this.ctx || (appConfig && appConfig.enableSounds === false)) return;
    const now = this.ctx.currentTime;

    // 1. Warm low body tone sweep (triangle wave, 240Hz -> 150Hz)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);

    oscGain.gain.setValueAtTime(0.008, now);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    // 2. Soft delicate crystalline bell chime (sine wave, A5 - 880Hz)
    const bell = this.ctx.createOscillator();
    const bellGain = this.ctx.createGain();

    bell.type = 'sine';
    bell.frequency.setValueAtTime(880, now);

    bellGain.gain.setValueAtTime(0.003, now);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    bell.connect(bellGain);
    bellGain.connect(this.ctx.destination);

    // 3. Gentle slide swoosh (150ms noise swept down by a bandpass filter)
    try {
      const bufferSize = this.ctx.sampleRate * 0.15; // 150ms
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.15);
      filter.Q.setValueAtTime(2.0, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.010, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.15);
    } catch (e) {
      console.warn("Switch whoosh noise skipped:", e);
    }

    osc.start(now);
    osc.stop(now + 0.15);
    bell.start(now);
    bell.stop(now + 0.15);
  },

  playApply() {
    this.init();
    if (!this.ctx || (appConfig && appConfig.enableSounds === false)) return;
    const now = this.ctx.currentTime;

    // 1. Warm Sub-Bass (A2 - 110Hz) to ground the action
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(110, now);

    subGain.gain.setValueAtTime(0, now);
    subGain.gain.linearRampToValueAtTime(0.015, now + 0.05); // 50ms attack
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);

    subOsc.start(now);
    subOsc.stop(now + 0.6);

    // 2. Beautiful Staggered Crystalline Chime (A Major Chord: A4, C#5, E5, A5)
    // Runs through a lowpass filter at 1.5kHz to keep it incredibly warm and smooth.
    const chord = [440.00, 554.37, 659.25, 880.00];

    chord.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      const start = now + (index * 0.035); // Stagger arpeggio

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1500, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.008, start + 0.035); // Soft 35ms attack
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.50);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + 0.50);
    });
  },

  playNotification() {
    this.init();
    if (!this.ctx || (appConfig && appConfig.enableSounds === false)) return;
    const now = this.ctx.currentTime;

    // Soft, warm executive hotel chime (E5 -> A5 with soft attacks)
    const tones = [
      { freq: 659.25, offset: 0, duration: 0.4 },
      { freq: 880.00, offset: 0.08, duration: 0.5 }
    ];

    tones.forEach(t => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      const start = now + t.offset;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(t.freq, start);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.012, start + 0.04); // Soft 40ms attack
      gain.gain.exponentialRampToValueAtTime(0.0001, start + t.duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + t.duration);
    });
  }
};

// ==========================================================================
// TRANSLATIONS DICTIONARY & INTERNATIONALIZATION SYSTEM
// ==========================================================================
const TRANSLATIONS = {
  en: {
    STATUS_DISCONNECTED: "DISCONNECTED",
    STATUS_VAL_DISCONNECTED: "VALORANT DISCONNECTED",
    PILL_LOL_DETECTION: "Click to enable/disable League of Legends detection",
    PILL_VALORANT_DETECTION: "Click to enable/disable Valorant detection",
    BTN_MUTE: "Mute Sounds",
    BTN_LANG: "Change Language / Cambiar Idioma",
    BTN_SETTINGS: "Settings",
    WELCOME_BADGE_SYNC: "Active Sync",
    LOADING: "Loading...",
    WELCOME_BADGE_USERS: "active users",
    WELCOME_DESC: "The elite tactical analysis engine. Open League of Legends or Valorant to begin the automated real-time import of profiles and builds from global One-tricks.",
    WELCOME_DOCK_TITLE: "LINKED PROFILES",
    WELCOME_DOCK_DESC: "Automatic detection active",
    ROLE_TOP: "Top Lane",
    ROLE_JUNGLE: "Jungle",
    ROLE_MID: "Mid Lane",
    ROLE_BOT: "Bot Lane (ADC)",
    ROLE_SUPPORT: "Support",
    SCRAPING_DATA: "Fetching data...",
    WORKSPACE_REC_SETTINGS: "Recommended Configuration",
    SETTING_AUTO_RUNES_COMPACT: "Auto-Runes",
    SETTING_AUTO_SPELLS_COMPACT: "Auto-Summoners",
    SETTING_AUTO_ITEMS_COMPACT: "Auto-Items",
    WORKSPACE_PRIMARY_TREE: "Primary",
    WORKSPACE_SECONDARY_TREE: "Secondary",
    WORKSPACE_SHARDS: "Attributes",
    WORKSPACE_SPELLS: "Summoners",
    WORKSPACE_SKILL_ORDER: "Skill Order",
    WORKSPACE_RECOMMENDED_ITEMS: "Recommended Items",
    ITEM_GROUP_STARTING: "Starting",
    ITEM_GROUP_BOOTS: "Boots",
    ITEM_GROUP_CORE: "Core (First 3)",
    ITEM_GROUP_RECOMMENDED: "Recommended",
    GAME_MODE_RANKED: "RANKED SOLO/DUO",
    GAME_HEADER_TITLE: "LIVE GAME IN PROGRESS",
    GAME_STATUS_LOADING: "Fetching real-time game information...",
    GAME_BTN_OPGG: "Open Multi OP.GG",
    GAME_BLUE_SIDE: "BLUE SIDE",
    GAME_ALLIED_TEAM: "ALLIED TEAM",
    GAME_RED_SIDE: "RED SIDE",
    GAME_ENEMY_TEAM: "ENEMY TEAM",
    GAME_BUILD_REC_TITLE: "YOUR RECOMMENDED IN-GAME BUILD",
    GAME_BUILD_LOADING: "Loading build for your champion...",
    ITEM_GROUP_SKILLS: "Skills",
    SETTINGS_TITLE: "Onetricks Client Settings",
    SETTINGS_SEC_BEHAVIOR: "Behavior",
    SETTING_AUTO_RUNES_TITLE: "Import Runes Automatically",
    SETTING_AUTO_RUNES_DESC: "Applies the runes directly to the game when you hover or lock in a champion.",
    SETTING_AUTO_SPELLS_TITLE: "Import Spells Automatically",
    SETTING_AUTO_SPELLS_DESC: "Applies the optimal summoner spells directly to the game.",
    SETTING_AUTO_ITEMS_TITLE: "Import Items Automatically",
    SETTING_AUTO_ITEMS_DESC: "Generates and injects a recommended item set directly into your in-game shop.",
    SETTING_FLASH_D_TITLE: "Flash on D",
    SETTING_FLASH_D_DESC: "Always places Flash on the D key instead of F if selected.",
    SETTING_DEBUG_BROWSER_TITLE: "Debug Mode (Show Browser)",
    SETTING_DEBUG_BROWSER_DESC: "Shows the background chromium window performing the scraping.",
    SETTING_START_STARTUP_TITLE: "Start on System Startup",
    SETTING_START_STARTUP_DESC: "Starts the application automatically in the background when the OS boots.",
    SETTING_SOUNDS_TITLE: "Interactive Sound Effects",
    SETTING_SOUNDS_DESC: "Enables button ticks, transitions, and application alerts.",
    SETTING_LOL_DETECTION_TITLE: "Enable League of Legends Detection",
    SETTING_LOL_DETECTION_DESC: "Automatically detects and imports data when you play League of Legends.",
    SETTING_VAL_DETECTION_TITLE: "Enable Valorant Detection",
    SETTING_VAL_DETECTION_DESC: "Automatically detects and displays profiles and ranks in real-time when you play Valorant.",
    SETTING_ZOOM_TITLE: "Application Zoom",
    SETTING_ZOOM_DESC: "Adjusts the scale of the application interface.",
    SETTINGS_SEC_LOL_PATH: "League of Legends Location",
    SETTING_LOL_PATH_TITLE: "LoL Installation Path / Lockfile",
    SETTING_LOL_PATH_DESC: "If the app does not detect your game, enter the path where the <b>lockfile</b> is located (usually <code>C:\\Riot Games\\League of Legends</code>).",
    BTN_BROWSE: "Browse",
    BTN_SAVE: "Save",
    PATH_SAVED_SUCCESS: "Path saved successfully",
    SETTINGS_SEC_VAL_PATH: "Valorant Location",
    SETTING_VAL_PATH_TITLE: "Valorant Installation Path / Riot Client",
    SETTING_VAL_PATH_DESC: "Enter the installation path of Riot Client/Valorant if detection is not automatic (usually located at <code>C:\\Users\\...\\AppData\\Local\\Riot Games</code>).",
    SETTINGS_SEC_UPDATES: "Automatic Updates",
    UPDATE_STATUS_UPTODATE: "The application is up to date.",
    BTN_CHECK_UPDATES: "Check for updates",
    BTN_CLOSE: "Close",

    // Dynamic Strings
    LOL_DISABLED: "LOL DISABLED",
    LOL_ENABLED_CONNECTED: "LOL DETECTED",
    LOL_ENABLED_SCANNING: "SEARCHING FOR CLIENT...",
    LOL_ENABLED_DISCONNECTED: "DISCONNECTED",
    VAL_DISABLED: "VAL DISABLED",
    VAL_ENABLED_CONNECTED: "VALORANT DETECTED",
    VAL_ENABLED_SCANNING: "SEARCHING VALORANT...",
    VAL_ENABLED_DISCONNECTED: "VALORANT DISCONNECTED",
    MUTE_SOUNDS: "Mute Sounds",
    UNMUTE_SOUNDS: "Unmute Sounds",
    PINNED_LABEL: "Pinned",
    PIN_ROLE_BTN_TITLE_PINNED: "Role {role} pinned. Click to unpin.",
    PIN_ROLE_BTN_LABEL_UNPINNED: "Pin Role",
    PIN_ROLE_BTN_TITLE_UNPINNED: "Pin selected role to always apply it",
    ACTIVE_GAME_LOL_LABEL: "Active Match - Viewing Solo/DuoQ Stats",
    ACTIVE_GAME_VAL_PREGAME: "Valorant Agent Select Phase - Viewing allied team stats",
    ACTIVE_GAME_VAL_INPROGRESS: "Active Valorant Match - Viewing MMR & Agent stats",
    WAITING_CONNECTION_LOL: "🔌 WAITING FOR LCU CONNECTION...",
    WAITING_CONNECTION_LOL_SUB: "Start champion select or open League of Legends",
    VIEW_OPGG_PROFILE: "View profile on OP.GG",
    VIEW_VAL_TRACKER_PROFILE: "View profile on Valorant Tracker",
    EMPTY_ITEMS_LIST: "None",
    SKILL_ORDER_PLAYRATE_TITLE: "Percentage of matches using this skill order",
    CHAMP_SELECT_SELECTING: "SELECTING...",
    CHAMP_PORTRAIT_TITLE: "View champion profile on onetricks.gg",
    LOADING_BUILD_CHAMP: "Loading build for your champion...",
    RECOMMENDED_BUILD_CHAMP: "Recommended Build for {champion}{role}",
    APPLIED_SUCCESS: "Runes and spells applied successfully!",
    APPLIED_DIRECTLY: "{components} applied directly to the game!",
    RUNE_COMP: "Runes",
    SPELL_COMP: "Spells",
    ITEM_COMP: "Items",
    AND: "and",
    BROWSE_LOL_TITLE: "Select League of Legends Folder or Lockfile",
    BROWSE_VAL_TITLE: "Select Valorant / Riot Client Folder or Lockfile",
    UPDATER_CHECKING_BTN: "Checking...",
    UPDATER_CHECKING: "Checking for updates...",
    UPDATER_CHECKING_SERVER: "Checking for updates on the server...",
    UPDATER_NEW_VERSION: "New version available: <span style=\"color:var(--accent-blue);font-weight:700;\">v{version}</span>. Downloading...",
    UPDATER_UPTODATE: "The application is up to date.",
    UPDATER_ERROR: "<span style=\"color:var(--status-red);\">Error checking for updates{error}</span>",
    UPDATER_DOWNLOADING: "Downloading update... <span style=\"font-weight:700;color:var(--accent-purple-light);\">{percent}%</span>",
    UPDATER_READY: "Version <span style=\"color:var(--status-green);font-weight:700;\">v{version}</span> ready! It will be installed automatically when you close the client.",
    UPDATER_RESTART: "Restart",
    UPDATER_CHECK_BTN_DEFAULT: "Check for updates",
    GAMES_LABEL: "Games",
    UNRANKED_LABEL: "UNRANKED"
  },
  es: {
    STATUS_DISCONNECTED: "DESCONECTADO",
    STATUS_VAL_DISCONNECTED: "VALORANT DESCONECTADO",
    PILL_LOL_DETECTION: "Haz clic para activar o desactivar la detección de League of Legends",
    PILL_VALORANT_DETECTION: "Haz clic para activar o desactivar la detección de Valorant",
    BTN_MUTE: "Silenciar Sonidos",
    BTN_LANG: "Cambiar Idioma / Change Language",
    BTN_SETTINGS: "Configuración",
    WELCOME_BADGE_SYNC: "Sincronización Activa",
    LOADING: "Cargando...",
    WELCOME_BADGE_USERS: "usuarios activos",
    WELCOME_DESC: "El motor de análisis táctico de élite. Abre League of Legends o Valorant para comenzar la importación automatizada en tiempo real de perfiles y builds de los mejores One-tricks del mundo.",
    WELCOME_DOCK_TITLE: "PERFILES ENLAZADOS",
    WELCOME_DOCK_DESC: "Detección automática activa",
    ROLE_TOP: "Carril Superior",
    ROLE_JUNGLE: "Jungla",
    ROLE_MID: "Carril Central",
    ROLE_BOT: "Carril Inferior (ADC)",
    ROLE_SUPPORT: "Soporte",
    SCRAPING_DATA: "Obteniendo datos...",
    WORKSPACE_REC_SETTINGS: "Configuración Recomendada",
    SETTING_AUTO_RUNES_COMPACT: "Auto-Runas",
    SETTING_AUTO_SPELLS_COMPACT: "Auto-Hechizos",
    SETTING_AUTO_ITEMS_COMPACT: "Auto-Objetos",
    WORKSPACE_PRIMARY_TREE: "Principal",
    WORKSPACE_SECONDARY_TREE: "Secundario",
    WORKSPACE_SHARDS: "Atributos",
    WORKSPACE_SPELLS: "Hechizos",
    WORKSPACE_SKILL_ORDER: "Orden de Habilidades",
    WORKSPACE_RECOMMENDED_ITEMS: "Objetos Recomendados",
    ITEM_GROUP_STARTING: "Inicial",
    ITEM_GROUP_BOOTS: "Botas",
    ITEM_GROUP_CORE: "Objetos Clave (Primeros 3)",
    ITEM_GROUP_RECOMMENDED: "Recomendados",
    GAME_MODE_RANKED: "SOLO/DUO CLASIFICATORIA",
    GAME_HEADER_TITLE: "PARTIDA EN CURSO",
    GAME_STATUS_LOADING: "Obteniendo información de la partida en tiempo real...",
    GAME_BTN_OPGG: "Abrir Multi OP.GG",
    GAME_BLUE_SIDE: "LADO AZUL",
    GAME_ALLIED_TEAM: "EQUIPO ALIADO",
    GAME_RED_SIDE: "LADO ROJO",
    GAME_ENEMY_TEAM: "EQUIPO ENEMIGO",
    GAME_BUILD_REC_TITLE: "TU BUILD RECOMENDADA EN PARTIDA",
    GAME_BUILD_LOADING: "Cargando build para tu campeón...",
    ITEM_GROUP_SKILLS: "Habilidades",
    SETTINGS_TITLE: "Configuración de Onetricks Client",
    SETTINGS_SEC_BEHAVIOR: "Comportamiento",
    SETTING_AUTO_RUNES_TITLE: "Importar Runas Automáticamente",
    SETTING_AUTO_RUNES_DESC: "Aplica las runas directamente al juego cuando pasas el cursor o seleccionas un campeón.",
    SETTING_AUTO_SPELLS_TITLE: "Importar Hechizos Automáticamente",
    SETTING_AUTO_SPELLS_DESC: "Aplica los hechizos de invocador óptimos directamente al juego.",
    SETTING_AUTO_ITEMS_TITLE: "Importar Objetos Automáticamente",
    SETTING_AUTO_ITEMS_DESC: "Genera e inyecta un conjunto de objetos recomendados directamente en tu tienda del juego.",
    SETTING_FLASH_D_TITLE: "Destello en la D",
    SETTING_FLASH_D_DESC: "Coloca siempre el Destello en la tecla D en lugar de la F si está seleccionado.",
    SETTING_DEBUG_BROWSER_TITLE: "Modo Depuración (Mostrar Navegador)",
    SETTING_DEBUG_BROWSER_DESC: "Muestra la ventana de Chromium en segundo plano que realiza el raspado de datos.",
    SETTING_START_STARTUP_TITLE: "Iniciar con el Sistema",
    SETTING_START_STARTUP_DESC: "Inicia la aplicación automáticamente en segundo plano cuando arranca el sistema operativo.",
    SETTING_SOUNDS_TITLE: "Efectos de Sonido Interactivos",
    SETTING_SOUNDS_DESC: "Activa los clics de botones, transiciones y alertas de la aplicación.",
    SETTING_LOL_DETECTION_TITLE: "Activar Detección de League of Legends",
    SETTING_LOL_DETECTION_DESC: "Detecta e importa datos automáticamente cuando juegas a League of Legends.",
    SETTING_VAL_DETECTION_TITLE: "Activar Detección de Valorant",
    SETTING_VAL_DETECTION_DESC: "Detecta y muestra perfiles y rangos automáticamente en tiempo real cuando juegas a Valorant.",
    SETTING_ZOOM_TITLE: "Zoom de la Aplicación",
    SETTING_ZOOM_DESC: "Ajusta la escala de la interfaz de la aplicación.",
    SETTINGS_SEC_LOL_PATH: "Ubicación de League of Legends",
    SETTING_LOL_PATH_TITLE: "Ruta de Instalación de LoL / Lockfile",
    SETTING_LOL_PATH_DESC: "Si la app no detecta tu juego, introduce la ruta donde se encuentra el archivo <b>lockfile</b> (normalmente <code>C:\\Riot Games\\League of Legends</code>).",
    BTN_BROWSE: "Examinar",
    BTN_SAVE: "Guardar",
    PATH_SAVED_SUCCESS: "Ruta guardada correctamente",
    SETTINGS_SEC_VAL_PATH: "Ubicación de Valorant",
    SETTING_VAL_PATH_TITLE: "Ruta de Instalación de Valorant / Riot Client",
    SETTING_VAL_PATH_DESC: "Introduce la ruta de instalación de Riot Client/Valorant si la detección no es automática (normalmente en <code>C:\\Users\\...\\AppData\\Local\\Riot Games</code>).",
    SETTINGS_SEC_UPDATES: "Actualizaciones Automáticas",
    UPDATE_STATUS_UPTODATE: "La aplicación se encuentra en su versión más reciente.",
    BTN_CHECK_UPDATES: "Buscar actualizaciones",
    BTN_CLOSE: "Cerrar",

    // Dynamic Strings
    LOL_DISABLED: "LOL DESACTIVADO",
    LOL_ENABLED_CONNECTED: "LOL DETECTADO",
    LOL_ENABLED_SCANNING: "BUSCANDO CLIENTE...",
    LOL_ENABLED_DISCONNECTED: "DESCONECTADO",
    VAL_DISABLED: "VAL DESACTIVADO",
    VAL_ENABLED_CONNECTED: "VALORANT DETECTADO",
    VAL_ENABLED_SCANNING: "BUSCANDO VALORANT...",
    VAL_ENABLED_DISCONNECTED: "VALORANT DESCONECTADO",
    MUTE_SOUNDS: "Silenciar Sonidos",
    UNMUTE_SOUNDS: "Activar Sonidos",
    PINNED_LABEL: "Fijado",
    PIN_ROLE_BTN_TITLE_PINNED: "Rol {role} fijado. Haz clic para desanclar.",
    PIN_ROLE_BTN_LABEL_UNPINNED: "Fijar Rol",
    PIN_ROLE_BTN_TITLE_UNPINNED: "Fijar rol seleccionado para que se aplique siempre",
    ACTIVE_GAME_LOL_LABEL: "Partida activa - Visualizando estadísticas de Solo/DuoQ",
    ACTIVE_GAME_VAL_PREGAME: "Fase de Selección de Agente de Valorant - Visualizando estadísticas de tu equipo",
    ACTIVE_GAME_VAL_INPROGRESS: "Partida activa de Valorant - Visualizando estadísticas de MMR y Agentes",
    WAITING_CONNECTION_LOL: "🔌 ESPERANDO CONEXIÓN LCU...",
    WAITING_CONNECTION_LOL_SUB: "Inicia selección de campeones o abre League of Legends",
    VIEW_OPGG_PROFILE: "Ver perfil en OP.GG",
    VIEW_VAL_TRACKER_PROFILE: "Ver perfil en Valorant-Tracker",
    EMPTY_ITEMS_LIST: "Ninguno",
    SKILL_ORDER_PLAYRATE_TITLE: "Porcentaje de partidas usando este orden de habilidades",
    CHAMP_SELECT_SELECTING: "SELECCIONANDO...",
    CHAMP_PORTRAIT_TITLE: "Ver perfil del campeón en onetricks.gg",
    LOADING_BUILD_CHAMP: "Cargando build para tu campeón...",
    RECOMMENDED_BUILD_CHAMP: "Build Recomendada para {champion}{role}",
    APPLIED_SUCCESS: "¡Runas y hechizos aplicados con éxito!",
    APPLIED_DIRECTLY: "¡{components} aplicadas/os directamente al juego!",
    RUNE_COMP: "Runas",
    SPELL_COMP: "Hechizos",
    ITEM_COMP: "Objetos",
    AND: "y",
    BROWSE_LOL_TITLE: "Seleccionar Carpeta o Lockfile de League of Legends",
    BROWSE_VAL_TITLE: "Seleccionar Carpeta o Lockfile de Valorant / Riot Client",
    UPDATER_CHECKING_BTN: "Buscando...",
    UPDATER_CHECKING: "Buscando actualizaciones...",
    UPDATER_CHECKING_SERVER: "Buscando actualizaciones en el servidor...",
    UPDATER_NEW_VERSION: "Nueva versión disponible: <span style=\"color:var(--accent-blue);font-weight:700;\">v{version}</span>. Descargando...",
    UPDATER_UPTODATE: "La aplicación se encuentra en su versión más reciente.",
    UPDATER_ERROR: "<span style=\"color:var(--status-red);\">Error al buscar actualizaciones{error}</span>",
    UPDATER_DOWNLOADING: "Descargando actualización... <span style=\"font-weight:700;color:var(--accent-purple-light);\">{percent}%</span>",
    UPDATER_READY: "¡Versión <span style=\"color:var(--status-green);font-weight:700;\">v{version}</span> lista! Se instalará automáticamente al cerrar el cliente.",
    UPDATER_RESTART: "Reiniciar",
    UPDATER_CHECK_BTN_DEFAULT: "Buscar actualizaciones",
    GAMES_LABEL: "Partidas",
    UNRANKED_LABEL: "SIN CLASIFICAR"
  }
};

let currentLang = localStorage.getItem('onetricks_lang') || 'en';

function applyTranslations(lang) {
  currentLang = lang;
  localStorage.setItem('onetricks_lang', lang);

  // Apply static text translations
  const elements = document.querySelectorAll('[data-translate]');
  elements.forEach(el => {
    const key = el.getAttribute('data-translate');
    if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      // Use innerHTML for description if it contains HTML (like b or code tags), else textContent
      if (key.includes('_DESC') || key.includes('_HTML') || el.querySelector('span') || el.querySelector('i')) {
        const icon = el.querySelector('i');
        if (icon) {
          el.innerHTML = '';
          el.appendChild(icon);
          el.appendChild(document.createTextNode(' ' + TRANSLATIONS[lang][key]));
        } else {
          el.innerHTML = TRANSLATIONS[lang][key];
        }
      } else {
        el.textContent = TRANSLATIONS[lang][key];
      }
    }
  });

  // Apply title/tooltip translations
  const titleElements = document.querySelectorAll('[data-translate-title]');
  titleElements.forEach(el => {
    const key = el.getAttribute('data-translate-title');
    if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      el.title = TRANSLATIONS[lang][key];
    }
  });

  // Update dynamic content as well
  updateLcuStatusUI(lastLcuStatus);
  updateValorantStatusUI(lastValStatus);
  if (lastPlayerInfo) {
    updatePlayerProfileUI(lastPlayerInfo);
  } else {
    updatePlayerProfileUI(null);
  }

  // Sync pinned role label and title
  updatePinnedRoleUI(appConfig.pinnedRole);

  const elLcuPill = document.getElementById('lcu-pill');
  if (elLcuPill) {
    elLcuPill.title = TRANSLATIONS[lang].PILL_LOL_DETECTION;
  }
  const elValPill = document.getElementById('val-pill');
  if (elValPill) {
    elValPill.title = TRANSLATIONS[lang].PILL_VALORANT_DETECTION;
  }
  const elPortraitContainer = document.querySelector('.portrait-container');
  if (elPortraitContainer) {
    elPortraitContainer.title = TRANSLATIONS[lang].CHAMP_PORTRAIT_TITLE;
  }

  updateSoundToggleButtonUI(appConfig.enableSounds !== false);

  // Re-broadcast choice to main process to persist inside config.json
  if (window.api && window.api.toggleAutoApply) {
    window.api.toggleAutoApply({
      autoApplyRunes: appConfig.autoApplyRunes,
      autoApplySpells: appConfig.autoApplySpells,
      autoApplyItems: appConfig.autoApplyItems,
      flashOnD: appConfig.flashOnD,
      debugBrowser: appConfig.debugBrowser,
      startAtLogin: appConfig.startAtLogin,
      enableSounds: appConfig.enableSounds,
      enableLolDetection: appConfig.enableLolDetection,
      enableValorantDetection: appConfig.enableValorantDetection,
      enableLowPerf: appConfig.enableLowPerf,
      lang: lang
    });
  }
}

// DOM Elements Cache
const elStatusDot = document.getElementById('status-dot');
const elStatusText = document.getElementById('status-text');
const elLcuPill = document.getElementById('lcu-pill');

const elValStatusDot = document.getElementById('val-status-dot');
const elValStatusText = document.getElementById('val-status-text');
const elValPill = document.getElementById('val-pill');

const elWelcomeProfileContainer = document.getElementById('welcome-profile-container');
const elWorkspaceProfileContainer = document.getElementById('workspace-profile-container');

const elScreenWelcome = document.getElementById('screen-welcome');
const elScreenWorkspace = document.getElementById('screen-workspace');
const elScreenGame = document.getElementById('screen-game');

const elBlueTeamPlayers = document.getElementById('blue-team-players');
const elRedTeamPlayers = document.getElementById('red-team-players');
const elBtnOpenMultiOpgg = document.getElementById('btn-open-multi-opgg');
const elGameStatusLbl = document.getElementById('game-status-lbl');

// Game active player champion build elements cache
const elGameChampionBuild = document.getElementById('game-champion-build');
const elGameBuildChampName = document.getElementById('game-build-champ-name');
const elGameBuildPrimaryIcon = document.getElementById('game-build-primary-icon');
const elGameBuildPrimaryName = document.getElementById('game-build-primary-name');
const elGameBuildPrimaryRunes = document.getElementById('game-build-primary-runes');
const elGameBuildSecondaryIcon = document.getElementById('game-build-secondary-icon');
const elGameBuildSecondaryName = document.getElementById('game-build-secondary-name');
const elGameBuildSecondaryRunes = document.getElementById('game-build-secondary-runes');
const elGameBuildShards = document.getElementById('game-build-shards');
const elGameBuildSpells = document.getElementById('game-build-spells');
const elGameBuildSkills = document.getElementById('game-build-skills');
const elGameBuildStartingItems = document.getElementById('game-build-starting-items');
const elGameBuildBootsItems = document.getElementById('game-build-boots-items');
const elGameBuildCoreItems = document.getElementById('game-build-core-items');
const elGameBuildRecommendedItems = document.getElementById('game-build-recommended-items');

const elCheckAutoRunes = document.getElementById('check-auto-runes');
const elCheckAutoSpells = document.getElementById('check-auto-spells');
const elCheckAutoItems = document.getElementById('check-auto-items');

const elChampBgBanner = document.getElementById('champ-bg-banner');
const elChampPortrait = document.getElementById('champ-portrait');
const elChampName = document.getElementById('champ-name');
const elRoleSelector = document.getElementById('role-selector');

const elLoadingOverlay = document.getElementById('loading-overlay');
const elLoadingText = document.getElementById('loading-text');

const elIconPrimaryStyle = document.getElementById('icon-primary-style');
const elNamePrimaryStyle = document.getElementById('name-primary-style');
const elListPrimaryRunes = document.getElementById('list-primary-runes');

const elIconSubStyle = document.getElementById('icon-sub-style');
const elNameSubStyle = document.getElementById('name-sub-style');
const elListSecondaryRunes = document.getElementById('list-secondary-runes');

const elListShards = document.getElementById('list-shards');
const elListSpells = document.getElementById('list-spells');
const elSkillOrderBox = document.getElementById('skill-order-box');
const elSkillOrderValue = document.getElementById('skill-order-value');

const elActionStatusIndicator = document.getElementById('action-status-indicator');
const elBtnManualApply = document.getElementById('btn-manual-apply');

const elBtnSettings = document.getElementById('btn-settings');
const elBtnToggleSound = document.getElementById('btn-toggle-sound');
const elBtnSettingsClose = document.getElementById('btn-settings-close');
const elSettingsOverlay = document.getElementById('settings-overlay');
const elSettingsCheckRunes = document.getElementById('settings-check-runes');
const elSettingsCheckSpells = document.getElementById('settings-check-spells');
const elSettingsCheckItems = document.getElementById('settings-check-items');
const elSettingsCheckFlashD = document.getElementById('settings-check-flash-d');
const elSettingsCheckDebugBrowser = document.getElementById('settings-check-debug-browser');
const elSettingsCheckStartLogin = document.getElementById('settings-check-start-login');
const elSettingsCheckSounds = document.getElementById('settings-check-sounds');
const elSettingsCheckLolDetection = document.getElementById('settings-check-lol-detection');
const elSettingsCheckValorantDetection = document.getElementById('settings-check-valorant-detection');
const elSettingsCheckLowPerf = document.getElementById('settings-check-low-perf');
const elBtnZoomOut = document.getElementById('btn-zoom-out');
const elBtnZoomIn = document.getElementById('btn-zoom-in');
const elZoomValue = document.getElementById('zoom-value');
const elListStartingItems = document.getElementById('list-starting-items');
const elListBootsItems = document.getElementById('list-boots-items');
const elListCoreItems = document.getElementById('list-core-items');
const elListRecommendedItems = document.getElementById('list-recommended-items');
const elBtnSettingsDone = document.getElementById('btn-settings-done');

const elInputLolPath = document.getElementById('input-lol-path');
const elBtnSavePath = document.getElementById('btn-save-path');
const elPathSuccessLbl = document.getElementById('path-success-lbl');

const elInputValPath = document.getElementById('input-val-path');
const elBtnSaveValPath = document.getElementById('btn-save-val-path');
const elValPathSuccessLbl = document.getElementById('val-path-success-lbl');
const elBtnBrowseLol = document.getElementById('btn-browse-lol');
const elBtnBrowseVal = document.getElementById('btn-browse-val');

const elBtnMinimize = document.getElementById('btn-minimize');
const elBtnClose = document.getElementById('btn-close');

// Local visual state data memory
let activeScrapedData = null;
let activeChampionName = '';
let currentLoadingChamp = '';
let currentLoadingSkin = -1;
let activeRuneSetIndex = 0;
let activeRuneSet = null;
let runesReforged = [];
let ddragonVersion = '14.10.1'; // Default fallback version
let lastPlayerInfo = null; // Store last player info to allow re-rendering when DDragon loads
let lastLcuStatus = 'disconnected'; // Track LCU status transitions for SFX cues
let lastValStatus = 'disconnected'; // Track Valorant status
let appVersion = '1.0.0'; // Default fallback version
let appConfig = {
  autoApplyRunes: true,
  autoApplySpells: true,
  autoApplyItems: true,
  customLoLPath: '',
  flashOnD: false,
  debugBrowser: false,
  startAtLogin: false,
  pinnedRole: 'default',
  enableSounds: true,
  enableLolDetection: true,
  enableValorantDetection: true
};

// Toggle low performance overrides strictly based on active game screen and config
function updateLowPerfClass() {
  const shouldApply = (appConfig && appConfig.enableLowPerf === true) && elScreenGame && elScreenGame.classList.contains('active');
  document.body.classList.toggle('low-perf', shouldApply);
}

// Reactive screen observer to apply low-performance overrides as soon as in-game screen activates/deactivates
const lowPerfObserver = new MutationObserver(() => {
  updateLowPerfClass();
});
if (elScreenGame) {
  lowPerfObserver.observe(elScreenGame, { attributes: true, attributeFilter: ['class'] });
}

const ZOOM_LEVELS = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3];



// ==========================================================================
// INITIAL STATE LOADING & BINDINGS
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize dynamic active user counter
  initActiveUserCounter();

  // Load runesReforged.json from local cache
  try {
    const res = await fetch('ddragon_cache/runesReforged.json');
    runesReforged = await res.json();
    console.log('[RENDERER] Loaded runesReforged.json successfully');
  } catch (err) {
    console.error('[RENDERER] Failed to load runesReforged.json:', err);
  }

  // 1. Fetch initial configuration & states from main process
  try {
    const state = await window.api.getInitialState();
    appConfig = state.config;
    if (appConfig && appConfig.lang) {
      currentLang = appConfig.lang;
    }
    
    // Apply translations first thing
    applyTranslations(currentLang);

    if (state.ddragonVersion) {
      ddragonVersion = state.ddragonVersion;
    }
    if (state.version) {
      appVersion = state.version;
      const elVersionLabel = document.getElementById('update-version-label');
      if (elVersionLabel) {
        elVersionLabel.textContent = currentLang === 'en' ? `Current version: v${appVersion}` : `Versión actual: v${appVersion}`;
      }
    }
    updateConfigUI(appConfig);
    updateLcuStatusUI(state.appState.lcuStatus);
    
    // Valorant Status UI Init
    if (state.appState.valorantStatus) {
      updateValorantStatusUI(state.appState.valorantStatus);
    }
    if (state.valorantPlayerInfo) {
      updateValorantPlayerProfileUI(state.valorantPlayerInfo);
    } else if (state.appState && state.appState.valorantPlayerInfo) {
      updateValorantPlayerProfileUI(state.appState.valorantPlayerInfo);
    } else if (appConfig && appConfig.lastValProfile) {
      updateValorantPlayerProfileUI({ ...appConfig.lastValProfile, isCached: true });
    }

    if (state.appState.lcuStatus === 'connected' && state.playerInfo) {
      updatePlayerProfileUI(state.playerInfo);
    } else if (appConfig && appConfig.lastLolProfile) {
      updatePlayerProfileUI({ ...appConfig.lastLolProfile, isCached: true });
    } else {
      updatePlayerProfileUI(null);
    }

    if (state.appState && state.appState.activeGame) {
      console.log('[RENDERER] Active game detected at startup. Rendering...');
      elScreenWelcome.classList.remove('active');
      elScreenWorkspace.classList.remove('active');
      elScreenGame.classList.add('active');
      renderActiveGame(state.appState.activeGame);
      if (state.appState.scrapedData) {
        renderGameChampionBuild(state.appState.scrapedData);
      }
    } else if (state.appState && state.appState.activeValorantGame) {
      console.log('[RENDERER] Active Valorant game detected at startup. Rendering...');
      elScreenWelcome.classList.remove('active');
      elScreenWorkspace.classList.remove('active');
      elScreenGame.classList.add('active');
      renderValorantActiveGame(state.appState.activeValorantGame);
    }
  } catch (err) {
    console.error('Failed to get initial state:', err);
  }

  // 2. Bind Header window custom actions (Minimize / Close)
  elBtnMinimize.addEventListener('click', () => {
    sfx.playTick();
    window.api.minimizeWindow();
  });
  elBtnClose.addEventListener('click', () => {
    sfx.playTick();
    window.api.closeWindow();
  });

  // Language switcher toggle button listener
  const elBtnToggleLang = document.getElementById('btn-toggle-lang');
  if (elBtnToggleLang) {
    elBtnToggleLang.addEventListener('click', () => {
      const nextLang = currentLang === 'en' ? 'es' : 'en';
      sfx.playTick();
      applyTranslations(nextLang);
    });
  }

  // Bind connection status pills click events to toggle scan detections directly
  const elLcuPill = document.getElementById('lcu-pill');
  if (elLcuPill) {
    elLcuPill.title = TRANSLATIONS[currentLang].PILL_LOL_DETECTION;
    elLcuPill.addEventListener('click', () => {
      appConfig.enableLolDetection = !appConfig.enableLolDetection;
      if (elSettingsCheckLolDetection) {
        elSettingsCheckLolDetection.checked = appConfig.enableLolDetection;
      }
      sfx.playSwitch();
      handleToggleChange();
      updateLcuStatusUI(lastLcuStatus);
    });
  }

  const elValPill = document.getElementById('val-pill');
  if (elValPill) {
    elValPill.title = TRANSLATIONS[currentLang].PILL_VALORANT_DETECTION;
    elValPill.addEventListener('click', () => {
      appConfig.enableValorantDetection = !appConfig.enableValorantDetection;
      if (elSettingsCheckValorantDetection) {
        elSettingsCheckValorantDetection.checked = appConfig.enableValorantDetection;
      }
      sfx.playSwitch();
      handleToggleChange();
      updateValorantStatusUI(lastValStatus);
    });
  }

  // 3. Bind Settings overlays openers/closers
  elBtnSettings.addEventListener('click', () => {
    sfx.playSwitch();
    elSettingsOverlay.classList.add('active');
  });

  const closeSettings = () => {
    sfx.playSwitch();
    elSettingsOverlay.classList.remove('active');
    elPathSuccessLbl.style.display = 'none';
    if (elValPathSuccessLbl) {
      elValPathSuccessLbl.style.display = 'none';
    }
  };
  elBtnSettingsClose.addEventListener('click', closeSettings);
  elBtnSettingsDone.addEventListener('click', closeSettings);

  // 4. Bind settings save buttons & toggles
  elBtnSavePath.addEventListener('click', () => {
    sfx.playTick();
    const pathStr = elInputLolPath.value.trim();
    window.api.saveCustomPath(pathStr);
    elPathSuccessLbl.style.display = 'block';
    setTimeout(() => {
      elPathSuccessLbl.style.display = 'none';
    }, 3000);
  });

  if (elBtnSaveValPath) {
    elBtnSaveValPath.addEventListener('click', () => {
      sfx.playTick();
      const pathStr = elInputValPath.value.trim();
      window.api.saveCustomValPath(pathStr);
      elValPathSuccessLbl.style.display = 'block';
      setTimeout(() => {
        elValPathSuccessLbl.style.display = 'none';
      }, 3000);
    });
  }

  if (elBtnBrowseLol) {
    elBtnBrowseLol.addEventListener('click', async () => {
      sfx.playTick();
      const selected = await window.api.selectPath({
        title: TRANSLATIONS[currentLang].BROWSE_LOL_TITLE,
        defaultPath: elInputLolPath.value
      });
      if (selected) {
        elInputLolPath.value = selected;
        window.api.saveCustomPath(selected);
        elPathSuccessLbl.style.display = 'block';
        setTimeout(() => {
          elPathSuccessLbl.style.display = 'none';
        }, 3000);
      }
    });
  }

  if (elBtnBrowseVal) {
    elBtnBrowseVal.addEventListener('click', async () => {
      sfx.playTick();
      const selected = await window.api.selectPath({
        title: TRANSLATIONS[currentLang].BROWSE_VAL_TITLE,
        defaultPath: elInputValPath.value
      });
      if (selected) {
        elInputValPath.value = selected;
        window.api.saveCustomValPath(selected);
        elValPathSuccessLbl.style.display = 'block';
        setTimeout(() => {
          elValPathSuccessLbl.style.display = 'none';
        }, 3000);
      }
    });
  }

  // Wire sync across all identical checkboxes in UI
  const handleToggleChange = () => {
    const prevAutoApplyRunes = appConfig.autoApplyRunes;
    const prevAutoApplySpells = appConfig.autoApplySpells;
    const prevAutoApplyItems = appConfig.autoApplyItems;

    appConfig.autoApplyRunes = elCheckAutoRunes.checked;
    appConfig.autoApplySpells = elCheckAutoSpells.checked;
    appConfig.autoApplyItems = elCheckAutoItems.checked;
    appConfig.flashOnD = elSettingsCheckFlashD.checked;
    appConfig.debugBrowser = elSettingsCheckDebugBrowser.checked;
    appConfig.startAtLogin = elSettingsCheckStartLogin.checked;
    appConfig.enableSounds = elSettingsCheckSounds.checked;
    appConfig.enableLolDetection = elSettingsCheckLolDetection.checked;
    appConfig.enableValorantDetection = elSettingsCheckValorantDetection.checked;
    if (elSettingsCheckLowPerf) {
      appConfig.enableLowPerf = elSettingsCheckLowPerf.checked;
    }

    updateLowPerfClass();
    updateSoundToggleButtonUI(appConfig.enableSounds);
    sfx.playTick(); // Tick will respect the updated enableSounds state immediately!

    // Sync states
    elSettingsCheckRunes.checked = appConfig.autoApplyRunes;
    elSettingsCheckSpells.checked = appConfig.autoApplySpells;
    elSettingsCheckItems.checked = appConfig.autoApplyItems;
    elCheckAutoRunes.checked = appConfig.autoApplyRunes;
    elCheckAutoSpells.checked = appConfig.autoApplySpells;
    elCheckAutoItems.checked = appConfig.autoApplyItems;

    window.api.toggleAutoApply({
      autoApplyRunes: appConfig.autoApplyRunes,
      autoApplySpells: appConfig.autoApplySpells,
      autoApplyItems: appConfig.autoApplyItems,
      flashOnD: appConfig.flashOnD,
      debugBrowser: appConfig.debugBrowser,
      startAtLogin: appConfig.startAtLogin,
      enableSounds: appConfig.enableSounds,
      enableLolDetection: appConfig.enableLolDetection,
      enableValorantDetection: appConfig.enableValorantDetection,
      enableLowPerf: appConfig.enableLowPerf
    });

    // If activeScrapedData is loaded and any of the settings transitioned from OFF to ON, apply directly!
    let appliedComponents = [];
    if (activeScrapedData) {
      const buildToApply = {};

      if (appConfig.autoApplyRunes && !prevAutoApplyRunes) {
        const runeSet = activeScrapedData.runeSets
          ? activeScrapedData.runeSets[activeRuneSetIndex]
          : activeScrapedData.runes;
        if (runeSet && runeSet.raw) {
          buildToApply.runes = runeSet.raw;
          appliedComponents.push('Runas');
        }
      }

      if (appConfig.autoApplySpells && !prevAutoApplySpells) {
        if (activeScrapedData.summoners && activeScrapedData.summoners.raw) {
          buildToApply.summoners = activeScrapedData.summoners.raw;
          appliedComponents.push('Hechizos');
        }
      }

      if (appConfig.autoApplyItems && !prevAutoApplyItems) {
        if (activeScrapedData.items) {
          buildToApply.items = activeScrapedData.items;
          appliedComponents.push('Objetos');
        }
      }

      if (Object.keys(buildToApply).length > 0) {
        window.api.applyBuild(buildToApply);
        sfx.playApply();

        let componentsStr = '';
        if (appliedComponents.length === 1) {
          componentsStr = appliedComponents[0];
        } else {
          componentsStr = appliedComponents.slice(0, -1).join(', ') + ' y ' + appliedComponents[appliedComponents.length - 1];
        }

        // Show temporary flashing success indicator
        showTemporaryStatus(`¡${componentsStr} aplicadas/os directamente al juego!`);
        return;
      }
    }

    updateBottomActionLayout();
  };

  elSettingsCheckFlashD.addEventListener('change', handleToggleChange);
  elSettingsCheckDebugBrowser.addEventListener('change', handleToggleChange);
  elSettingsCheckStartLogin.addEventListener('change', handleToggleChange);
  elSettingsCheckSounds.addEventListener('change', handleToggleChange);
  elSettingsCheckLolDetection.addEventListener('change', handleToggleChange);
  elSettingsCheckValorantDetection.addEventListener('change', handleToggleChange);
  if (elSettingsCheckLowPerf) {
    elSettingsCheckLowPerf.addEventListener('change', handleToggleChange);
  }

  if (elBtnZoomOut) {
    elBtnZoomOut.addEventListener('click', () => {
      sfx.playTick();
      const currentZoom = appConfig.zoomFactor !== undefined ? appConfig.zoomFactor : 1.0;
      let currentIndex = ZOOM_LEVELS.indexOf(Math.round(currentZoom * 10) / 10);
      if (currentIndex === -1) currentIndex = ZOOM_LEVELS.indexOf(1.0);
      
      if (currentIndex > 0) {
        const nextZoom = ZOOM_LEVELS[currentIndex - 1];
        appConfig.zoomFactor = nextZoom;
        if (elZoomValue) elZoomValue.textContent = `${Math.round(nextZoom * 100)}%`;
        window.api.toggleAutoApply({
          autoApplyRunes: appConfig.autoApplyRunes,
          autoApplySpells: appConfig.autoApplySpells,
          autoApplyItems: appConfig.autoApplyItems,
          flashOnD: appConfig.flashOnD,
          debugBrowser: appConfig.debugBrowser,
          startAtLogin: appConfig.startAtLogin,
          enableSounds: appConfig.enableSounds,
          enableLolDetection: appConfig.enableLolDetection,
          enableValorantDetection: appConfig.enableValorantDetection,
          zoomFactor: nextZoom,
          enableLowPerf: appConfig.enableLowPerf
        });
      }
    });
  }

  if (elBtnZoomIn) {
    elBtnZoomIn.addEventListener('click', () => {
      sfx.playTick();
      const currentZoom = appConfig.zoomFactor !== undefined ? appConfig.zoomFactor : 1.0;
      let currentIndex = ZOOM_LEVELS.indexOf(Math.round(currentZoom * 10) / 10);
      if (currentIndex === -1) currentIndex = ZOOM_LEVELS.indexOf(1.0);
      
      if (currentIndex < ZOOM_LEVELS.length - 1) {
        const nextZoom = ZOOM_LEVELS[currentIndex + 1];
        appConfig.zoomFactor = nextZoom;
        if (elZoomValue) elZoomValue.textContent = `${Math.round(nextZoom * 100)}%`;
        window.api.toggleAutoApply({
          autoApplyRunes: appConfig.autoApplyRunes,
          autoApplySpells: appConfig.autoApplySpells,
          autoApplyItems: appConfig.autoApplyItems,
          flashOnD: appConfig.flashOnD,
          debugBrowser: appConfig.debugBrowser,
          startAtLogin: appConfig.startAtLogin,
          enableSounds: appConfig.enableSounds,
          enableLolDetection: appConfig.enableLolDetection,
          enableValorantDetection: appConfig.enableValorantDetection,
          zoomFactor: nextZoom,
          enableLowPerf: appConfig.enableLowPerf
        });
      }
    });
  }

  if (elBtnToggleSound) {
    elBtnToggleSound.addEventListener('click', () => {
      const newState = !(appConfig.enableSounds !== false);
      appConfig.enableSounds = newState;
      elSettingsCheckSounds.checked = newState;
      updateSoundToggleButtonUI(newState);
      handleToggleChange();
    });
  }

  [elCheckAutoRunes, elCheckAutoSpells, elCheckAutoItems, elSettingsCheckRunes, elSettingsCheckSpells, elSettingsCheckItems].forEach(box => {
    box.addEventListener('change', (e) => {
      // Sync identical checkboxes
      if (box === elSettingsCheckRunes) {
        elCheckAutoRunes.checked = e.target.checked;
      } else if (box === elSettingsCheckSpells) {
        elCheckAutoSpells.checked = e.target.checked;
      } else if (box === elSettingsCheckItems) {
        elCheckAutoItems.checked = e.target.checked;
      } else if (box === elCheckAutoRunes) {
        elSettingsCheckRunes.checked = e.target.checked;
      } else if (box === elCheckAutoSpells) {
        elSettingsCheckSpells.checked = e.target.checked;
      } else if (box === elCheckAutoItems) {
        elSettingsCheckItems.checked = e.target.checked;
      }
      handleToggleChange();
    });
  });

  // Manual applying click handler
  if (elBtnManualApply) {
    elBtnManualApply.addEventListener('click', () => {
      sfx.playApply();
      if (activeScrapedData) {
        // Pick first/selected rune set
        const runeSet = activeScrapedData.runeSets
          ? activeScrapedData.runeSets[activeRuneSetIndex]
          : activeScrapedData.runes;
        window.api.applyBuild({
          runes: runeSet.raw,
          summoners: activeScrapedData.summoners.raw,
          items: activeScrapedData.items
        });

        // Show temporary manual success indicator
        elActionStatusIndicator.innerHTML = '<span class="indicator-green-text">✅ ¡Runas y hechizos aplicados con éxito!</span>';
        elActionStatusIndicator.classList.add('active');
      }
    });
  }

  // 5. Bind role selector buttons click events
  if (elRoleSelector) {
    const buttons = elRoleSelector.querySelectorAll('.role-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        sfx.playTick();
        const role = btn.getAttribute('data-role');
        // Visually update immediately for responsiveness
        updateActiveRoleUI(role);
        // Trigger main thread change-role IPC
        window.api.changeRole(role);
      });
    });
  }

  // 6. Bind pin role button
  const elBtnPinRole = document.getElementById('btn-pin-role');
  if (elBtnPinRole) {
    elBtnPinRole.addEventListener('click', () => {
      sfx.playTick();
      const activeBtn = elRoleSelector.querySelector('.role-btn.active');
      const activeRole = activeBtn ? activeBtn.getAttribute('data-role') : 'default';

      if (appConfig.pinnedRole && appConfig.pinnedRole !== 'default') {
        if (appConfig.pinnedRole === activeRole) {
          // If clicking while looking at the pinned role, unpin it
          appConfig.pinnedRole = 'default';
          window.api.pinRole('default');
          updatePinnedRoleUI('default');
        } else {
          // If looking at a different role, pin this new role instead!
          if (activeRole && activeRole !== 'default') {
            appConfig.pinnedRole = activeRole;
            window.api.pinRole(activeRole);
            updatePinnedRoleUI(activeRole);
          }
        }
      } else {
        // Pin the active role
        if (activeRole && activeRole !== 'default') {
          appConfig.pinnedRole = activeRole;
          window.api.pinRole(activeRole);
          updatePinnedRoleUI(activeRole);
        }
      }
    });
  }

  // 7. Bind champion portrait click to open onetricks.gg profile
  const elPortraitContainer = document.querySelector('.portrait-container');
  if (elPortraitContainer) {
    elPortraitContainer.title = "Ver perfil del campeón en onetricks.gg";
    elPortraitContainer.addEventListener('click', () => {
      if (activeChampionName) {
        const activeBtn = elRoleSelector.querySelector('.role-btn.active');
        const role = activeBtn ? activeBtn.getAttribute('data-role') : 'default';
        
        let url = `https://www.onetricks.gg/es/champions/builds/${activeChampionName}`;
        if (role && role !== 'default') {
          url += `?role=${role}`;
        }
        sfx.playNotification();
        window.open(url, '_blank');
      }
    });
  }
});

// Sync visual toggle checkbox states
function updateConfigUI(config) {
  elCheckAutoRunes.checked = config.autoApplyRunes;
  elCheckAutoSpells.checked = config.autoApplySpells;
  elCheckAutoItems.checked = config.autoApplyItems;
  elSettingsCheckRunes.checked = config.autoApplyRunes;
  elSettingsCheckSpells.checked = config.autoApplySpells;
  elSettingsCheckItems.checked = config.autoApplyItems;
  elSettingsCheckFlashD.checked = !!config.flashOnD;
  elSettingsCheckDebugBrowser.checked = !!config.debugBrowser;
  elSettingsCheckStartLogin.checked = !!config.startAtLogin;
  elSettingsCheckSounds.checked = config.enableSounds !== false;
  elSettingsCheckLolDetection.checked = config.enableLolDetection !== false;
  elSettingsCheckValorantDetection.checked = config.enableValorantDetection !== false;
  if (elSettingsCheckLowPerf) {
    elSettingsCheckLowPerf.checked = config.enableLowPerf === true;
  }
  updateLowPerfClass();
  updateSoundToggleButtonUI(config.enableSounds !== false);
  elInputLolPath.value = config.customLoLPath || '';
  if (elInputValPath) {
    elInputValPath.value = config.customValPath || '';
  }

  const currentZoom = config.zoomFactor !== undefined ? config.zoomFactor : 1.0;
  if (elZoomValue) {
    elZoomValue.textContent = `${Math.round(currentZoom * 100)}%`;
  }

  updatePinnedRoleUI(config.pinnedRole);
}

// Update the volume icon and muted styles in the header
function updateSoundToggleButtonUI(enabled) {
  const elBtnToggleSound = document.getElementById('btn-toggle-sound');
  if (!elBtnToggleSound) return;

  if (enabled) {
    elBtnToggleSound.classList.remove('muted');
    elBtnToggleSound.title = "Silenciar Sonidos";
    elBtnToggleSound.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
    `;
  } else {
    elBtnToggleSound.classList.add('muted');
    elBtnToggleSound.title = "Activar Sonidos";
    elBtnToggleSound.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
    `;
  }
}

// Update the visual representation of the pinned role button
function updatePinnedRoleUI(pinnedRole) {
  const elBtnPinRole = document.getElementById('btn-pin-role');
  const elPinRoleText = document.getElementById('pin-role-text');
  if (!elBtnPinRole || !elPinRoleText) return;

  const roleLabels = {
    'default': 'default',
    'top': 'TOP',
    'jungle': currentLang === 'en' ? 'JNG' : 'JUG',
    'mid': 'MID',
    'bot': 'BOT',
    'support': 'SUP'
  };

  if (pinnedRole && pinnedRole !== 'default') {
    elBtnPinRole.classList.add('pinned');
    const label = roleLabels[pinnedRole] || pinnedRole.toUpperCase();
    elPinRoleText.textContent = `${TRANSLATIONS[currentLang].PINNED_LABEL}: ${label}`;
    elBtnPinRole.title = TRANSLATIONS[currentLang].PIN_ROLE_BTN_TITLE_PINNED.replace('{role}', pinnedRole.toUpperCase());
  } else {
    elBtnPinRole.classList.remove('pinned');
    elPinRoleText.textContent = TRANSLATIONS[currentLang].PIN_ROLE_BTN_LABEL_UNPINNED;
    elBtnPinRole.title = TRANSLATIONS[currentLang].PIN_ROLE_BTN_TITLE_UNPINNED;
  }
}

// Update connection pill visual styles in header
function updateLcuStatusUI(status) {
  if (appConfig && appConfig.enableLolDetection === false) {
    elStatusDot.className = 'status-dot disconnected';
    elStatusText.textContent = TRANSLATIONS[currentLang].LOL_DISABLED;
    elLcuPill.style.borderColor = 'rgba(239, 68, 68, 0.15)';
    elLcuPill.style.opacity = '0.55';
    elLcuPill.style.borderStyle = 'dashed';
    return;
  }

  elLcuPill.style.opacity = '1.0';
  elLcuPill.style.borderStyle = 'solid';
  elStatusDot.className = 'status-dot ' + status;

  if (status === 'connected') {
    elStatusText.textContent = TRANSLATIONS[currentLang].LOL_ENABLED_CONNECTED;
    elLcuPill.style.borderColor = 'rgba(16, 185, 129, 0.25)';
  } else if (status === 'scanning') {
    elStatusText.textContent = TRANSLATIONS[currentLang].LOL_ENABLED_SCANNING;
    elLcuPill.style.borderColor = 'rgba(245, 158, 11, 0.25)';
  } else {
    elStatusText.textContent = TRANSLATIONS[currentLang].LOL_ENABLED_DISCONNECTED;
    elLcuPill.style.borderColor = 'rgba(255, 255, 255, 0.05)';
  }
}

// Translate ranks to dynamically active language
const TIER_TRANSLATIONS = {
  en: {
    'IRON': 'Iron',
    'BRONZE': 'Bronze',
    'SILVER': 'Silver',
    'GOLD': 'Gold',
    'PLATINUM': 'Platinum',
    'EMERALD': 'Emerald',
    'DIAMOND': 'Diamond',
    'MASTER': 'Master',
    'GRANDMASTER': 'Grandmaster',
    'CHALLENGER': 'Challenger',
    'UNRANKED': 'Unranked'
  },
  es: {
    'IRON': 'Hierro',
    'BRONZE': 'Bronce',
    'SILVER': 'Plata',
    'GOLD': 'Oro',
    'PLATINUM': 'Platino',
    'EMERALD': 'Esmeralda',
    'DIAMOND': 'Diamante',
    'MASTER': 'Maestro',
    'GRANDMASTER': 'Gran Maestro',
    'CHALLENGER': 'Aspirante',
    'UNRANKED': 'Sin clasificar'
  }
};

function updatePlayerProfileUI(playerInfo) {
  lastPlayerInfo = playerInfo;
  if (!playerInfo) {
    if (elWelcomeProfileContainer) {
      elWelcomeProfileContainer.innerHTML = `
        <div class="player-profile-card rank-disconnected">
          <div class="scan-line"></div>
          <div class="profile-card-content" style="justify-content: center; text-align: center; padding: 12px 16px;">
            <div class="profile-info" style="align-items: center; gap: 4px;">
              <span class="profile-name pulsing-text" style="color: var(--text-muted); font-size: 13px; font-weight: 700;">${TRANSLATIONS[currentLang].WAITING_CONNECTION_LOL}</span>
              <span class="profile-tier" style="color: rgba(255, 255, 255, 0.25); font-size: 10px; font-weight: 500; letter-spacing: 0.5px;">${TRANSLATIONS[currentLang].WAITING_CONNECTION_LOL_SUB}</span>
            </div>
          </div>
        </div>
      `;
    }
    if (elWorkspaceProfileContainer) {
      elWorkspaceProfileContainer.innerHTML = '';
      elWorkspaceProfileContainer.style.display = 'none';
    }
    return;
  }

  const rawTier = (playerInfo.tier || 'UNRANKED').toUpperCase();
  const tierClass = rawTier.toLowerCase();
  const translatedTier = TIER_TRANSLATIONS[currentLang][rawTier] || rawTier;

  const isApex = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rawTier);
  const divisionStr = isApex ? '' : ` ${playerInfo.division || ''}`;
  const tierLabel = rawTier === 'UNRANKED' || rawTier === 'NONE'
    ? TRANSLATIONS[currentLang].UNRANKED_LABEL
    : `${translatedTier}${divisionStr} (${playerInfo.lp} LP)`;

  const totalGames = playerInfo.wins + playerInfo.losses;
  const statsText = totalGames > 0
    ? `${playerInfo.winrate}% WR - ${totalGames} ${TRANSLATIONS[currentLang].GAMES_LABEL}`
    : `0% WR - 0 ${TRANSLATIONS[currentLang].GAMES_LABEL}`;

  const avatarUrl = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/profileicon/${playerInfo.profileIconId}.png`;

  // Format dynamic OP.GG URL supporting Riot Names with #taglines
  let gameName = (playerInfo.gameName || '').trim();
  let tagLine = (playerInfo.tagLine || '').trim();
  const displayName = (playerInfo.displayName || '').trim();

  // Robust parsing: if gameName or tagLine is missing but displayName contains '#', extract them
  if ((!gameName || !tagLine) && displayName.includes('#')) {
    const parts = displayName.split('#');
    gameName = parts[0].trim();
    tagLine = parts[1].trim();
  }

  let opggUrl = '';
  if (gameName && tagLine) {
    opggUrl = `https://op.gg/es/lol/summoners/euw/${encodeURIComponent(gameName)}-${encodeURIComponent(tagLine)}`;
  } else {
    opggUrl = `https://op.gg/es/lol/summoners/search?q=${encodeURIComponent(displayName || gameName)}&region=euw`;
  }

  const cachedStyle = playerInfo.isCached ? 'opacity: 0.65; filter: grayscale(0.2); transition: all 0.3s ease;' : '';
  const cardHtml = `
    <div class="player-profile-card rank-${tierClass}" style="${cachedStyle}">
      <div class="rank-bg-glow"></div>
      <div class="profile-card-content">
        <div class="avatar-wrapper">
          <img class="profile-avatar" src="${avatarUrl}" alt="Avatar" onerror="if(!this.src.includes('14.10.1')){this.src='https://ddragon.leagueoflegends.com/cdn/14.10.1/img/profileicon/${playerInfo.profileIconId}.png';}else{this.onerror=null;this.src='https://ddragon.leagueoflegends.com/cdn/14.10.1/img/profileicon/29.png';}">
          <span class="profile-level">${playerInfo.summonerLevel}</span>
        </div>
        <a class="profile-link-wrapper" href="${opggUrl}" target="_blank" title="${TRANSLATIONS[currentLang].VIEW_OPGG_PROFILE}">
          <div class="profile-info">
            <span class="profile-name">${playerInfo.displayName}</span>
            <div class="rank-badge-row">
              <span class="profile-tier">${tierLabel}</span>
            </div>
            <span class="profile-stats">${statsText}</span>
          </div>
        </a>
      </div>
    </div>
  `;

  if (elWelcomeProfileContainer) {
    elWelcomeProfileContainer.innerHTML = cardHtml;
  }
  if (elWorkspaceProfileContainer) {
    elWorkspaceProfileContainer.innerHTML = cardHtml;
    elWorkspaceProfileContainer.style.display = 'block';
  }
}

let temporaryStatusTimeout = null;

// Show a temporary success message in the action status indicator
function showTemporaryStatus(message) {
  if (temporaryStatusTimeout) {
    clearTimeout(temporaryStatusTimeout);
  }

  elActionStatusIndicator.innerHTML = `<span class="indicator-green-text-intense"><span class="pulse-dot"></span>${message}</span>`;
  elActionStatusIndicator.classList.add('active');

  temporaryStatusTimeout = setTimeout(() => {
    temporaryStatusTimeout = null;
    updateBottomActionLayout();
  }, 4000);
}

// Update bottom actions footer status indicator with dynamic info
function updateBottomActionLayout() {
  if (temporaryStatusTimeout) return; // Don't interrupt showing temporary success state!

  elActionStatusIndicator.innerHTML = '';
  elActionStatusIndicator.classList.remove('active');

  if (elBtnManualApply) {
    elBtnManualApply.style.display = 'none'; // Ensure manual apply button is always hidden if somehow referenced
  }
}

// ==========================================================================
// BACKGROUND THREAD EVENTS LISTENERS (IPC BRIDGES)
// ==========================================================================

// Connection status updates listener
window.api.onLcuStatus(({ status, config, playerInfo, ddragonVersion: newVersion }) => {
  if (newVersion) {
    ddragonVersion = newVersion;
  }
  if (config) {
    appConfig = config;
    updateConfigUI(config);
  }

  // Play chime on LCU online connection transition
  if (status === 'connected' && lastLcuStatus !== 'connected') {
    sfx.playNotification();
  }
  lastLcuStatus = status;

  updateLcuStatusUI(status);
  if (status !== 'connected') {
    if (appConfig && appConfig.lastLolProfile) {
      updatePlayerProfileUI({ ...appConfig.lastLolProfile, isCached: true });
    } else {
      updatePlayerProfileUI(null);
    }
  } else if (playerInfo) {
    updatePlayerProfileUI(playerInfo);
  }
});

window.api.onValorantStatus(({ status, playerInfo, config }) => {
  if (config) {
    appConfig = config;
    updateConfigUI(config);
  }
  lastValStatus = status;
  updateValorantStatusUI(status);
  if (status !== 'connected') {
    if (appConfig && appConfig.lastValProfile) {
      updateValorantPlayerProfileUI({ ...appConfig.lastValProfile, isCached: true });
    } else {
      updateValorantPlayerProfileUI(null);
    }
  } else {
    updateValorantPlayerProfileUI(playerInfo);
  }
});

window.api.onValorantGameStarted((gameData) => {
  renderValorantActiveGame(gameData);
});

window.api.onValorantGameEnded(() => {
  handleValorantGameEnded();
});

// Listener for asynchronous Data Dragon version initialization
window.api.onDDragonReady((newVersion) => {
  console.log(`[RENDERER] DDragon version ready: ${newVersion}`);
  ddragonVersion = newVersion;
  if (lastPlayerInfo) {
    updatePlayerProfileUI(lastPlayerInfo);
  }
});

// Preload and smoothly update background banner image without flashing to black
function setBannerBackground(championName, skinNumber) {
  if (!championName) {
    elChampBgBanner.style.backgroundImage = 'none';
    currentLoadingChamp = '';
    currentLoadingSkin = -1;
    return;
  }

  currentLoadingChamp = championName;
  currentLoadingSkin = skinNumber;

  const url = `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${championName}_${skinNumber}.jpg`;
  const img = new Image();
  img.onload = () => {
    if (currentLoadingChamp === championName && currentLoadingSkin === skinNumber && activeChampionName === championName) {
      elChampBgBanner.style.backgroundImage = `url('${url}')`;
    }
  };
  img.onerror = () => {
    if (skinNumber !== 0) {
      console.warn(`Failed to load skin ${skinNumber} for ${championName}, falling back to default.`);
      setBannerBackground(championName, 0);
    }
  };
  img.src = url;
}

// Champion selection changes listener
window.api.onChampSelectUpdate(({ active, championName, championDisplayName, championImage, role, skinId, resolvedSkinNumber, ddragonVersion: newVersion }) => {
  if (newVersion) {
    ddragonVersion = newVersion;
  }
  if (!active) {
    // Screen welcome transition
    if (elScreenWorkspace.classList.contains('active')) {
      sfx.playSwitch();
    }
    elScreenWorkspace.classList.remove('active');
    elScreenWelcome.classList.add('active');
    activeScrapedData = null;
    activeChampionName = '';
    updateAmbientGlowTheme(null);
  } else {
    // Screen workspace transition
    if (elScreenWelcome.classList.contains('active')) {
      sfx.playSwitch();
    }
    elScreenWelcome.classList.remove('active');
    elScreenWorkspace.classList.add('active');

    if (championName && championImage) {
      activeChampionName = championName;
      elChampName.textContent = championDisplayName.toUpperCase();
      elChampPortrait.src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${championImage}`;
      
      const skinNumber = resolvedSkinNumber !== undefined ? resolvedSkinNumber : (skinId ? (skinId % 1000) : 0);
      setBannerBackground(championName, skinNumber);

      // Update role selector active state
      updateActiveRoleUI(role || 'default');
    } else {
      // Hovering slot but no selection locked
      activeChampionName = '';
      elChampName.textContent = 'SELECCIONANDO...';
      elChampPortrait.src = '';
      setBannerBackground('', 0);

      // Reset role selector active state to default/ALL
      updateActiveRoleUI('default');
    }
  }
});

// Skin selection changes listener
window.api.onSkinUpdate(({ skinId, resolvedSkinNumber }) => {
  if (activeChampionName) {
    const skinNumber = resolvedSkinNumber !== undefined ? resolvedSkinNumber : (skinId ? (skinId % 1000) : 0);
    setBannerBackground(activeChampionName, skinNumber);
  }
});

// Format dynamic OP.GG URL helper supporting Riot IDs
function getOpggUrl(player) {
  let gameName = (player.gameName || '').trim();
  let tagLine = (player.tagLine || '').trim();
  const displayName = (player.displayName || '').trim();

  // Robust parsing: if gameName or tagLine is missing but displayName contains '#', extract them
  if ((!gameName || !tagLine) && displayName.includes('#')) {
    const parts = displayName.split('#');
    gameName = parts[0].trim();
    tagLine = parts[1].trim();
  }

  if (gameName && tagLine) {
    return `https://op.gg/es/lol/summoners/euw/${encodeURIComponent(gameName)}-${encodeURIComponent(tagLine)}`;
  } else {
    return `https://op.gg/es/lol/summoners/search?q=${encodeURIComponent(displayName || gameName)}&region=euw`;
  }
}

// Render dynamic players info in dashboard
function renderActiveGame(gameData) {
  if (!gameData) return;

  if (elGameStatusLbl) {
    elGameStatusLbl.textContent = 'Partida activa - Visualizando estadísticas de Solo/DuoQ';
  }

  if (elBlueTeamPlayers) elBlueTeamPlayers.innerHTML = '';
  if (elRedTeamPlayers) elRedTeamPlayers.innerHTML = '';

  const getTierClass = (tier) => {
    if (!tier) return 'unranked';
    return tier.toLowerCase();
  };

  const getTierLabel = (tier, division) => {
    if (!tier || tier === 'UNRANKED') return 'UNRANKED';
    const cleanTier = tier.toUpperCase();
    if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(cleanTier)) {
      return cleanTier;
    }
    return `${cleanTier} ${division || ''}`.trim();
  };

  const getWinrateClass = (winrate, wins, losses) => {
    if (wins + losses === 0) return 'wr-none';
    if (winrate >= 55) return 'wr-high';
    if (winrate >= 50) return 'wr-medium';
    return 'wr-low';
  };

  const renderPlayerList = (players, container) => {
    if (!container || !players) return;
    
    players.forEach(p => {
      const tierClass = getTierClass(p.tier);
      const tierLabel = getTierLabel(p.tier, p.division);
      const winrateClass = getWinrateClass(p.winrate, p.wins, p.losses);
      const totalGames = p.wins + p.losses;
      
      // Smart privacy fallback: Riot hides losses for enemy players in LCU, returning losses as 0.
      // If a player has wins but 0 losses (and wins is greater than 3), the 100% winrate is fake due to LCU privacy.
      const isWinrateHidden = p.losses === 0 && p.wins > 3;
      
      const opggUrl = getOpggUrl(p);
      
      // Smart Fallback: if we fetched a real summoner profile icon, use it. Otherwise, show their champion icon!
      const isRealSummonerIcon = p.profileIconId !== null && p.profileIconId !== undefined;
      const summonerIconImg = isRealSummonerIcon
        ? `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/profileicon/${p.profileIconId}.png`
        : `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${p.championImage || 'Aurora.png'}`;
        
      const card = document.createElement('div');
      card.className = `game-player-card rank-${tierClass}`;
      card.setAttribute('title', `Ver perfil de ${p.displayName} en OP.GG`);
      
      // Smart Name/Redundancy: if the player name matches the champion name (due to LCU privacy anonymization)
      const isAnonymized = !p.gameName || p.gameName.toLowerCase() === (p.championDisplayName || '').toLowerCase();
      let nameSpan = `<span class="player-name">${isAnonymized ? (p.championDisplayName || 'Desconocido') : p.gameName}</span>`;
      let tagSpan = (!isAnonymized && p.tagLine) ? `<span class="player-tag">#${p.tagLine}</span>` : '';
      let champNameSpan = isAnonymized 
        ? '' 
        : `<span class="player-champ-name">${p.championDisplayName || 'Desconocido'}</span>`;
 
      card.innerHTML = `
        <div class="player-champion-area">
          <div class="champion-icon-wrapper">
            <img class="player-champ-icon" src="${summonerIconImg}" alt="${p.displayName}" onerror="this.onerror=null; this.src='https://ddragon.leagueoflegends.com/cdn/14.10.1/img/profileicon/29.png';">
            <span class="player-level">${p.summonerLevel}</span>
          </div>
        </div>
        <div class="player-identity">
          <div class="player-riot-id">
            ${nameSpan}
            ${tagSpan}
          </div>
          ${champNameSpan}
        </div>
        <div class="player-stats">
          <div class="player-rank">
            <span class="rank-badge-text">${tierLabel}</span>
            <span class="rank-lp">${p.lp} LP</span>
          </div>
          ${isWinrateHidden ? '' : `
          <div class="player-winrate ${winrateClass}">
            <span class="wr-pct">${(totalGames > 0) ? p.winrate + '%' : '-%'}</span>
            <span class="wr-games">${p.wins}V / ${p.losses}D</span>
          </div>
          `}
        </div>
      `;
 
      card.addEventListener('click', () => {
        sfx.playTick();
        window.open(opggUrl, '_blank');
      });
 
      container.appendChild(card);
    });
  };

  renderPlayerList(gameData.blueTeam, elBlueTeamPlayers);
  renderPlayerList(gameData.redTeam, elRedTeamPlayers);

  // Setup Multi OP.GG click action
  if (elBtnOpenMultiOpgg) {
    const allPlayers = [...(gameData.blueTeam || []), ...(gameData.redTeam || [])];

    const summonersParam = allPlayers.map(p => {
      let name = (p.gameName || '').trim();
      let tag = (p.tagLine || '').trim();
      if (!name && p.displayName) {
        const parts = p.displayName.split('#');
        name = parts[0].trim();
        tag = parts[1] ? parts[1].trim() : '';
      }
      return tag ? `${name}#${tag}` : name;
    }).filter(Boolean).map(encodeURIComponent).join(',');

    const multiOpggUrl = `https://www.op.gg/multisearch/euw?summoners=${summonersParam}`;
    
    // Remove old event listeners
    const newBtn = elBtnOpenMultiOpgg.cloneNode(true);
    elBtnOpenMultiOpgg.parentNode.replaceChild(newBtn, elBtnOpenMultiOpgg);
    
    const updatedBtn = document.getElementById('btn-open-multi-opgg');
    updatedBtn.addEventListener('click', () => {
      sfx.playSwitch();
      window.open(multiOpggUrl, '_blank');
    });
  }
}

// Game started event listener
window.api.onGameStarted((gameData) => {
  console.log('[RENDERER] Game started event received:', gameData);
  if (!gameData) return;

  activeScrapedData = null; // Reset Champ select details

  // Clear and reset the champion build recommended panel initially
  if (elGameChampionBuild) elGameChampionBuild.style.display = 'block';
  if (elGameBuildChampName) elGameBuildChampName.textContent = 'Cargando build para tu campeón...';
  if (elGameBuildPrimaryIcon) elGameBuildPrimaryIcon.style.display = 'none';
  if (elGameBuildSecondaryIcon) elGameBuildSecondaryIcon.style.display = 'none';
  if (elGameBuildPrimaryRunes) elGameBuildPrimaryRunes.innerHTML = '';
  if (elGameBuildSecondaryRunes) elGameBuildSecondaryRunes.innerHTML = '';
  if (elGameBuildShards) elGameBuildShards.innerHTML = '';
  if (elGameBuildSpells) elGameBuildSpells.innerHTML = '';
  if (elGameBuildSkills) elGameBuildSkills.innerHTML = '';
  if (elGameBuildStartingItems) elGameBuildStartingItems.innerHTML = '';
  if (elGameBuildBootsItems) elGameBuildBootsItems.innerHTML = '';
  if (elGameBuildCoreItems) elGameBuildCoreItems.innerHTML = '';
  if (elGameBuildRecommendedItems) elGameBuildRecommendedItems.innerHTML = '';

  if (elScreenWelcome.classList.contains('active') || elScreenWorkspace.classList.contains('active')) {
    sfx.playSwitch();
  }
  
  elScreenWelcome.classList.remove('active');
  elScreenWorkspace.classList.remove('active');
  elScreenGame.classList.add('active');
  
  renderActiveGame(gameData);
});

// Game ended event listener
window.api.onGameEnded(() => {
  console.log('[RENDERER] Game ended event received');
  if (elScreenGame.classList.contains('active')) {
    sfx.playSwitch();
  }
  
  if (elGameChampionBuild) elGameChampionBuild.style.display = 'none';

  elScreenGame.classList.remove('active');
  elScreenWelcome.classList.add('active');
});

// ==========================================================================
// VALORANT REAL-TIME INTEGRATION FUNCTIONS
// ==========================================================================

// Update Valorant connection pill indicator in header
function updateValorantStatusUI(status) {
  if (!elValStatusDot || !elValStatusText || !elValPill) return;

  elValPill.style.display = 'flex';

  if (appConfig && appConfig.enableValorantDetection === false) {
    elValStatusDot.className = 'status-dot val disconnected';
    elValStatusText.textContent = 'VAL DESACTIVADO';
    elValPill.style.borderColor = 'rgba(255, 70, 85, 0.15)';
    elValPill.style.opacity = '0.55';
    elValPill.style.borderStyle = 'dashed';
    return;
  }

  elValPill.style.opacity = '1.0';
  elValPill.style.borderStyle = 'solid';
  elValStatusDot.className = 'status-dot val ' + status;

  if (status === 'connected') {
    elValStatusText.textContent = 'VALORANT DETECTADO';
    elValPill.style.borderColor = 'rgba(255, 70, 85, 0.35)'; // Valorant Red border
  } else if (status === 'scanning') {
    elValStatusText.textContent = 'BUSCANDO VALORANT...';
    elValPill.style.borderColor = 'rgba(245, 158, 11, 0.25)'; // Orange border
  } else {
    elValStatusText.textContent = 'VALORANT DESCONECTADO';
    elValPill.style.borderColor = 'rgba(255, 255, 255, 0.05)';
  }
}

// Render active game dashboard for Valorant
function renderValorantActiveGame(gameData) {
  if (!gameData) return;

  console.log('[RENDERER] Rendering active Valorant match dashboard...');
  
  if (elGameStatusLbl) {
    if (gameData.isPregame) {
      elGameStatusLbl.textContent = 'Fase de Selección de Agente de Valorant - Visualizando estadísticas de tu equipo';
    } else {
      elGameStatusLbl.textContent = 'Partida activa de Valorant - Visualizando estadísticas de MMR y Agentes';
    }
  }

  // Clear LoL specific layouts
  if (elBtnOpenMultiOpgg) {
    elBtnOpenMultiOpgg.style.display = 'none';
  }
  if (elGameChampionBuild) {
    elGameChampionBuild.style.display = 'none';
  }

  // Clear player columns
  if (elBlueTeamPlayers) elBlueTeamPlayers.innerHTML = '';
  if (elRedTeamPlayers) elRedTeamPlayers.innerHTML = '';

  const renderValorantPlayerList = (players, container) => {
    if (!container || !players) return;
    
    players.forEach(p => {
      const card = document.createElement('div');
      card.className = `game-player-card rank-val-${p.tier}`;
      card.setAttribute('title', `Ver perfil de ${p.displayName} en Valorant-Tracker`);

      // Construct rank badge icon
      let badgeHtml = '';
      if (p.tierIcon) {
        badgeHtml = `<img class="rank-badge-icon" src="${p.tierIcon}" alt="${p.tierName}" style="width: 22px; height: 22px; margin-right: 6px; object-fit: contain;">`;
      }

      // Tracker.gg URL
      const trackerUrl = `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(p.displayName)}/`;

      // Construct fallback image and alt tag cleanly to avoid broken text overlaps
      const isSelecting = p.championDisplayName.includes('Eligiendo') || p.championDisplayName.includes('Seleccionando');
      const altAttr = isSelecting ? '' : p.championDisplayName;
      const defaultAgentIcon = 'https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/displayicon.png';
      const agentIconSrc = p.championImage || defaultAgentIcon;

      card.innerHTML = `
        <div class="player-champion-area">
          <div class="champion-icon-wrapper">
            <img class="player-champ-icon val-agent-icon" src="${agentIconSrc}" alt="${altAttr}" onerror="this.onerror=null; this.src='${defaultAgentIcon}';">
            <span class="player-level val-level">${p.summonerLevel}</span>
          </div>
        </div>
        <div class="player-identity">
          <div class="player-riot-id">
            <span class="player-name" style="font-size: 13px;">${p.gameName}</span>
            <span class="player-tag">#${p.tagLine}</span>
          </div>
          <span class="player-champ-name">${p.championDisplayName}</span>
          <div class="rank-badge-row" style="display: flex; align-items: center; gap: 6px; margin-top: 3px; font-family: var(--font-display);">
            <span class="profile-stats" style="font-size: 10px; font-weight: 700; color: var(--text-secondary); margin-top: 0; white-space: nowrap;">
              ${p.games > 0 ? `${p.winrate}% WR (${p.games} Partidas)` : '0% WR (0 Partidas)'}
            </span>
            ${p.headshotPct > 0 ? `
              <span style="font-size: 10px; color: rgba(255,255,255,0.15);">|</span>
              <span style="font-size: 10px; color: #ff4655; font-weight: 800; letter-spacing: 0.3px; white-space: nowrap;">${p.headshotPct}% HS</span>
            ` : ''}
            ${p.adr > 0 ? `
              <span style="font-size: 10px; color: rgba(255,255,255,0.15);">|</span>
              <span style="font-size: 10px; color: var(--accent-blue); font-weight: 800; letter-spacing: 0.3px; white-space: nowrap;">${p.adr} ADR</span>
            ` : ''}
          </div>
        </div>
        <div class="player-stats">
          <div class="player-rank" style="display: flex; align-items: center;">
            ${badgeHtml}
            <div style="display: flex; flex-direction: column; line-height: 1.2;">
              <span class="rank-badge-text" style="font-size: 11px; font-weight: 700; color: #fff;">${p.tierName || 'UNRANKED'}</span>
              ${p.tier > 0 ? `<span class="rank-lp" style="font-size: 9px; color: var(--text-secondary); font-weight: 600;">${p.lp} RR</span>` : ''}
            </div>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        sfx.playTick();
        window.open(trackerUrl, '_blank');
      });

      container.appendChild(card);
    });
  };

  // Render Allied and Enemy team columns
  renderValorantPlayerList(gameData.blueTeam, elBlueTeamPlayers);
  renderValorantPlayerList(gameData.redTeam, elRedTeamPlayers);

  // Transition screen smoothly with SFX cue
  if (elScreenWelcome.classList.contains('active') || elScreenWorkspace.classList.contains('active')) {
    sfx.playSwitch();
  }

  elScreenWelcome.classList.remove('active');
  elScreenWorkspace.classList.remove('active');
  elScreenGame.classList.add('active');
}

// Handle transition back to Welcome screen when Valorant game ends
function handleValorantGameEnded() {
  console.log('[RENDERER] Valorant game ended, resetting dashboard...');
  
  if (elScreenGame.classList.contains('active')) {
    sfx.playSwitch();
  }

  // Restore LoL specific elements for next game flow
  if (elBtnOpenMultiOpgg) {
    elBtnOpenMultiOpgg.style.display = 'block';
  }

  elScreenGame.classList.remove('active');
  elScreenWelcome.classList.add('active');
}

// Helper to update active role button visual state
function updateActiveRoleUI(activeRole) {
  if (!elRoleSelector) return;
  const buttons = elRoleSelector.querySelectorAll('.role-btn');
  buttons.forEach(btn => {
    if (btn.getAttribute('data-role') === activeRole) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Helper to update background ambient glows dynamically
function updateAmbientGlowTheme(primaryStyleId) {
  const container = document.querySelector('.ambient-glow-container');
  if (!container) return;

  const layers = container.querySelectorAll('.ambient-glow');
  layers.forEach(layer => {
    const isTarget = primaryStyleId
      ? layer.classList.contains(`style-${primaryStyleId}`)
      : layer.classList.contains('style-default');

    layer.classList.toggle('active', isTarget);
  });
}

// Scraping stages listeners
window.api.onScrapeProgress(({ status, message }) => {
  elLoadingText.textContent = message;
  elLoadingOverlay.classList.add('active');
});

window.api.onScrapeError(({ message }) => {
  elLoadingText.textContent = `❌ ${message}`;
  setTimeout(() => {
    elLoadingOverlay.classList.remove('active');
  }, 3000);
});

window.api.onScrapeSuccess((data) => {
  elLoadingOverlay.classList.remove('active');
  if (data && data.ddragonVersion) {
    ddragonVersion = data.ddragonVersion;
  }
  activeScrapedData = data;
  if (elScreenGame.classList.contains('active')) {
    renderGameChampionBuild(data);
  } else {
    renderBuildDetails(data);
    if (data.role) {
      updateActiveRoleUI(data.role);
    }
  }
});

// Render the active player's champion build recommended panel inside the active game screen
function renderGameChampionBuild(data) {
  if (!data) return;

  if (elGameChampionBuild) {
    elGameChampionBuild.style.display = 'block';
  }

  const champName = data.champion || 'tu campeón';
  if (elGameBuildChampName) {
    const roleLabel = data.role && data.role !== 'default' ? ` (${data.role.toUpperCase()})` : '';
    elGameBuildChampName.textContent = `Build Recomendada para ${champName}${roleLabel}`;
  }

  const primarySet = data.runes || (data.runeSets && data.runeSets[0]);
  if (primarySet) {
    // Primary Tree
    if (elGameBuildPrimaryIcon) {
      elGameBuildPrimaryIcon.src = `https://ddragon.leagueoflegends.com/cdn/img/${primarySet.primaryStyleIcon}`;
      elGameBuildPrimaryIcon.style.display = 'block';
    }
    if (elGameBuildPrimaryName) {
      elGameBuildPrimaryName.textContent = primarySet.primaryStyleName;
    }
    if (elGameBuildPrimaryRunes) {
      elGameBuildPrimaryRunes.innerHTML = '';
      primarySet.primaryPerks.forEach((rune, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `rune-grid-item style-${primarySet.primaryStyleId} active`;
        if (index === 0) {
          itemDiv.classList.add('keystone-pulse');
        }
        itemDiv.title = `${rune.name}: ${rune.shortDesc || ''}`;

        const img = document.createElement('img');
        img.src = `https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`;
        img.className = index === 0 ? 'keystone-img' : 'rune-img';
        img.alt = rune.name;

        itemDiv.appendChild(img);
        elGameBuildPrimaryRunes.appendChild(itemDiv);
      });
    }

    // Secondary Tree
    if (elGameBuildSecondaryIcon) {
      elGameBuildSecondaryIcon.src = `https://ddragon.leagueoflegends.com/cdn/img/${primarySet.subStyleIcon}`;
      elGameBuildSecondaryIcon.style.display = 'block';
    }
    if (elGameBuildSecondaryName) {
      elGameBuildSecondaryName.textContent = primarySet.subStyleName;
    }
    if (elGameBuildSecondaryRunes) {
      elGameBuildSecondaryRunes.innerHTML = '';
      primarySet.secondaryPerks.forEach(rune => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `rune-grid-item style-${primarySet.subStyleId} active`;
        itemDiv.title = `${rune.name}: ${rune.shortDesc || ''}`;

        const img = document.createElement('img');
        img.src = `https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`;
        img.className = 'rune-img';
        img.alt = rune.name;

        itemDiv.appendChild(img);
        elGameBuildSecondaryRunes.appendChild(itemDiv);
      });
    }

    // Shards
    if (elGameBuildShards) {
      elGameBuildShards.innerHTML = '';
      if (primarySet.shardsPerks) {
        primarySet.shardsPerks.forEach(shard => {
          const itemDiv = document.createElement('div');
          itemDiv.className = 'rune-grid-item shard-item active';
          itemDiv.title = shard.name;

          const img = document.createElement('img');
          img.src = `https://ddragon.leagueoflegends.com/cdn/img/${shard.icon}`;
          img.className = 'shard-img';
          img.alt = shard.name;

          itemDiv.appendChild(img);
          elGameBuildShards.appendChild(itemDiv);
        });
      }
    }
  }

  // Summoner Spells
  if (elGameBuildSpells) {
    elGameBuildSpells.innerHTML = '';
    const spells = data.summoners;
    if (spells) {
      const spellList = [spells.spell1, spells.spell2];
      spellList.forEach(spell => {
        if (!spell) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'item-wrapper';
        wrapper.setAttribute('data-tooltip', spell.name);

        const img = document.createElement('img');
        img.src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/spell/${spell.icon}`;
        img.className = 'item-icon';
        img.alt = spell.name;

        wrapper.appendChild(img);
        elGameBuildSpells.appendChild(wrapper);
      });
    }
  }

  // Skill order maxing
  if (elGameBuildSkills) {
    elGameBuildSkills.innerHTML = '';
    const items = data.items;
    if (items && items.skillOrder && items.skillOrder.maxOrder) {
      items.skillOrder.maxOrder.forEach((skill, index) => {
        const badge = document.createElement('span');
        badge.className = 'skill-badge';
        badge.textContent = skill;
        elGameBuildSkills.appendChild(badge);

        if (index < items.skillOrder.maxOrder.length - 1) {
          const arrow = document.createElement('span');
          arrow.className = 'skill-arrow';
          arrow.textContent = '→';
          elGameBuildSkills.appendChild(arrow);
        }
      });
      if (items.skillOrder.playrate) {
        const playrateBadge = document.createElement('span');
        playrateBadge.className = 'skill-playrate-badge';
        playrateBadge.textContent = `${items.skillOrder.playrate}%`;
        elGameBuildSkills.appendChild(playrateBadge);
      }
    } else {
      elGameBuildSkills.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">No disponible</span>';
    }
  }

  // Items
  const items = data.items || { startingBuild: [], popularBoots: [], coreItems: [], recommendedItems: [] };
  renderItemGroup(elGameBuildStartingItems, items.startingBuild || [], true);
  renderItemGroup(elGameBuildBootsItems, items.popularBoots || [], true);
  renderItemGroup(elGameBuildCoreItems, items.coreBuild || items.coreItems || [], true);
  renderItemGroup(elGameBuildRecommendedItems, items.recommendedItems || [], true);
}

// ==========================================================================
// TEMPLATE ENGINE / RENDERING LOGIC
// ==========================================================================
// Stat Shards metadata for high-fidelity 3x3 grid display
const SHARD_META = {
  5001: { name: 'Vida Plana', icon: 'perk-images/StatMods/StatModsHealthPlusIcon.png' },
  5002: { name: 'Armadura', icon: 'perk-images/StatMods/StatModsArmorIcon.png' },
  5003: { name: 'Resistencia Mágica', icon: 'perk-images/StatMods/StatModsMagicResIcon.png' },
  5005: { name: 'Velocidad de Ataque', icon: 'perk-images/StatMods/StatModsAttackSpeedIcon.png' },
  5007: { name: 'Aceleración de Habilidad', icon: 'perk-images/StatMods/StatModsCDRScalingIcon.png' },
  5008: { name: 'Fuerza Adaptable', icon: 'perk-images/StatMods/StatModsAdaptiveForceIcon.png' },
  5010: { name: 'Velocidad de Movimiento', icon: 'perk-images/StatMods/StatModsMovementSpeedIcon.png' },
  5011: { name: 'Vida Escalar', icon: 'perk-images/StatMods/StatModsHealthScalingIcon.png' },
  5012: { name: 'Resistencia Escalar', icon: 'perk-images/StatMods/StatModsAdaptiveForceScalingIcon.png' },
  5013: { name: 'Tenacidad y Resistencia a Ralentizaciones', icon: 'perk-images/StatMods/StatModsTenacityIcon.png' }
};

// State variables for Keystone-grouped selection
let activeKeystonesList = [];
let selectedKeystoneIndex = 0;
let selectedSetIndex = 0;
let selectedSummonerIndex = 0;
let animateInTimeout = null;

function renderBuildDetails(data) {
  if (animateInTimeout) {
    clearTimeout(animateInTimeout);
  }
  elScreenWorkspace.classList.add('animate-in');

  const summoners = data.summoners;
  const items = data.items || { startingBuild: [], popularBoots: [], coreBuild: [], recommendedItems: [], coreItems: [] };

  // 1. Group the sets in data.runeSets by keystone
  const rawSets = data.runeSets || [data.runes];
  const keystonesMap = {};

  rawSets.forEach((set, originalIndex) => {
    const keystone = set.primaryPerks && set.primaryPerks[0];
    if (!keystone) return;

    const keystoneId = keystone.id;
    if (!keystonesMap[keystoneId]) {
      keystonesMap[keystoneId] = {
        id: keystoneId,
        name: keystone.name,
        icon: keystone.icon,
        playrateSum: 0,
        sets: []
      };
    }

    // Set the overall keystone playrate if available, otherwise sum set playrates
    if (set.keystonePlayrate !== undefined && set.keystonePlayrate !== null) {
      keystonesMap[keystoneId].playrateSum = set.keystonePlayrate;
    } else {
      keystonesMap[keystoneId].playrateSum += (set.playrate || 0);
    }

    keystonesMap[keystoneId].sets.push({
      set,
      originalIndex
    });
  });

  // Preserve the original order from the scraper's runeSets array (scraper already orders by website display order)
  Object.values(keystonesMap).forEach(group => {
    group.sets.sort((a, b) => a.originalIndex - b.originalIndex);
  });

  // Sort keystones by playrateSum descending
  activeKeystonesList = Object.values(keystonesMap).sort((a, b) => b.playrateSum - a.playrateSum);

  // Default selection: most popular keystone (index 0) and its first set (index 0)
  selectedKeystoneIndex = 0;
  selectedSetIndex = 0;

  // Render top keystone tabs
  renderKeystoneTabs();

  // Draw the selected set, shards, cards, and auto-apply!
  selectRuneSet(0, 0);

  // 3. Draw Summoner Spells (Multiple options ordered by playrate)
  const summonerOpts = data.summonersOptions || [summoners];
  const activeIdx = summonerOpts.findIndex(opt =>
    opt.raw.spell1Id === summoners.raw.spell1Id && opt.raw.spell2Id === summoners.raw.spell2Id
  );
  if (activeIdx !== -1) {
    selectedSummonerIndex = activeIdx;
  } else if (selectedSummonerIndex >= summonerOpts.length) {
    selectedSummonerIndex = 0;
  }
  renderSummonerOptions(summonerOpts);

  // 4. Draw Recommended Items
  renderItemGroup(elListStartingItems, items.startingBuild, true);
  renderItemGroup(elListBootsItems, items.popularBoots, true);
  renderItemGroup(elListCoreItems, items.coreBuild || items.coreItems || [], true);
  renderItemGroup(elListRecommendedItems, items.recommendedItems || [], true);

  // 5. Draw Skill Maxing Order
  if (items && items.skillOrder && items.skillOrder.maxOrder && items.skillOrder.maxOrder.length > 0) {
    elSkillOrderValue.innerHTML = '';

    // Create badges for each skill (e.g. E, Q, W)
    items.skillOrder.maxOrder.forEach((skill, index) => {
      const badge = document.createElement('span');
      badge.className = 'skill-badge';
      badge.textContent = skill;
      elSkillOrderValue.appendChild(badge);

      // If not the last skill, add an arrow separator
      if (index < items.skillOrder.maxOrder.length - 1) {
        const arrow = document.createElement('span');
        arrow.className = 'skill-arrow';
        arrow.textContent = '→';
        elSkillOrderValue.appendChild(arrow);
      }
    });

    // Add playrate badge if available
    if (items.skillOrder.playrate) {
      const playrateBadge = document.createElement('span');
      playrateBadge.className = 'skill-playrate-badge';
      playrateBadge.textContent = `${items.skillOrder.playrate}%`;
      playrateBadge.title = 'Porcentaje de partidas usando este orden de habilidades';
      elSkillOrderValue.appendChild(playrateBadge);
    }

    elSkillOrderBox.style.display = 'block';
  } else {
    elSkillOrderBox.style.display = 'none';
  }

  // 6. Update Footer Indicators
  updateBottomActionLayout();

  animateInTimeout = setTimeout(() => {
    elScreenWorkspace.classList.remove('animate-in');
    animateInTimeout = null;
  }, 1000);
}

// Render top keystone tabs
function renderKeystoneTabs() {
  const container = document.getElementById('keystone-tabs');
  if (!container) return;

  container.innerHTML = '';

  activeKeystonesList.forEach((keystoneGroup, index) => {
    const tab = document.createElement('div');
    const isSelected = index === selectedKeystoneIndex;

    tab.className = 'keystone-tab' + (isSelected ? ' active' : '');
    tab.title = keystoneGroup.name;

    const img = document.createElement('img');
    img.src = `https://ddragon.leagueoflegends.com/cdn/img/${keystoneGroup.icon}`;
    img.className = 'keystone-tab-img';
    img.alt = keystoneGroup.name;

    const info = document.createElement('div');
    info.className = 'keystone-tab-info';

    const name = document.createElement('span');
    name.className = 'keystone-tab-name';
    name.textContent = keystoneGroup.name;

    const playrate = document.createElement('span');
    playrate.className = 'keystone-tab-playrate';
    const formattedPr = Number(keystoneGroup.playrateSum.toFixed(1));
    playrate.textContent = `${formattedPr}% PR`;

    info.appendChild(name);
    info.appendChild(playrate);

    tab.appendChild(img);
    tab.appendChild(info);

    tab.addEventListener('click', () => {
      sfx.playTick();
      selectRuneSet(index, 0);
    });

    container.appendChild(tab);
  });
}

// Select specific set inside active keystone group
function selectRuneSet(keystoneIndex, setIndex) {
  if (!activeKeystonesList[keystoneIndex]) return;
  const keystoneGroup = activeKeystonesList[keystoneIndex];
  if (!keystoneGroup.sets[setIndex]) return;

  selectedKeystoneIndex = keystoneIndex;
  selectedSetIndex = setIndex;

  const selectedObj = keystoneGroup.sets[setIndex];
  const runeSet = selectedObj.set;
  activeRuneSet = runeSet;

  // Update the global index for backward-compatibility
  activeRuneSetIndex = selectedObj.originalIndex;

  // Render the selected rune set in the complete grid!
  renderRuneSet(runeSet);

  // Render the bottom card sets selector!
  renderRuneSetCards(keystoneGroup.sets, setIndex);

  // Highlight the correct keystone tab as active!
  document.querySelectorAll('.keystone-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === keystoneIndex);
  });

  // Auto-apply if enabled!
  if (appConfig.autoApplyRunes) {
    window.api.applyBuild({ runes: runeSet.raw });
  }
}

// Render bottom cards for sets selector
function renderRuneSetCards(sets, selectedIndex) {
  const container = document.getElementById('rune-sets-container');
  if (!container) return;

  container.innerHTML = '';

  sets.forEach((setItem, index) => {
    const set = setItem.set;
    const card = document.createElement('div');
    const isSelected = index === selectedIndex;

    card.className = 'rune-set-card' + (isSelected ? ' active' : '');
    card.title = `${set.primaryStyleName} + ${set.subStyleName}`;

    // Card header
    const header = document.createElement('div');
    header.className = 'rune-set-card-header';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'rune-set-card-title';
    titleSpan.textContent = `Set ${index + 1}`;

    const iconsDiv = document.createElement('div');
    iconsDiv.className = 'rune-set-card-icons';

    const primaryIcon = document.createElement('img');
    primaryIcon.src = `https://ddragon.leagueoflegends.com/cdn/img/${set.primaryStyleIcon}`;
    primaryIcon.className = 'rune-set-card-mini-icon';
    primaryIcon.alt = set.primaryStyleName;

    const plusSpan = document.createElement('span');
    plusSpan.className = 'rune-set-card-plus';
    plusSpan.textContent = '+';

    const subIcon = document.createElement('img');
    subIcon.src = `https://ddragon.leagueoflegends.com/cdn/img/${set.subStyleIcon}`;
    subIcon.className = 'rune-set-card-mini-icon';
    subIcon.alt = set.subStyleName;

    iconsDiv.appendChild(primaryIcon);
    iconsDiv.appendChild(plusSpan);
    iconsDiv.appendChild(subIcon);

    header.appendChild(titleSpan);
    header.appendChild(iconsDiv);

    // Card body
    const body = document.createElement('div');
    body.className = 'rune-set-card-body';

    const playrateLabel = document.createElement('div');
    playrateLabel.className = 'rune-set-card-playrate-label';
    playrateLabel.textContent = `${set.playrate}% Playrate`;

    const progressWrapper = document.createElement('div');
    progressWrapper.className = 'rune-set-card-progress-wrapper';

    const progressBar = document.createElement('div');
    progressBar.className = 'rune-set-card-progress-bar';
    progressBar.style.width = `${set.playrate}%`;

    progressWrapper.appendChild(progressBar);
    body.appendChild(playrateLabel);
    body.appendChild(progressWrapper);

    // Card footer
    const footer = document.createElement('div');
    footer.className = 'rune-set-card-footer';
    footer.textContent = `${set.subStyleName}`;

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);

    card.addEventListener('click', () => {
      sfx.playTick();
      selectRuneSet(selectedKeystoneIndex, index);
    });

    container.appendChild(card);
  });
}

// Helper to re-resolve raw selectedPerkIds back to rich display structures and re-render grid
function reResolveAndRender(runeSet) {
  if (!runeSet || !runeSet.raw) return;

  // Let's resolve the raw selectedPerkIds to perk objects.
  const allReforgedRunes = {};
  runesReforged.forEach(style => {
    if (style && style.slots) {
      style.slots.forEach(slot => {
        if (slot && slot.runes) {
          slot.runes.forEach(rune => {
            allReforgedRunes[rune.id] = {
              id: rune.id,
              name: rune.name,
              icon: rune.icon,
              styleId: style.id
            };
          });
        }
      });
    }
  });

  const selectedIds = runeSet.raw.selectedPerkIds || [];

  const primaryPerks = [];
  const secondaryPerks = [];
  const shardsPerks = [];

  selectedIds.forEach(id => {
    if (SHARD_META[id]) {
      shardsPerks.push({
        id,
        name: SHARD_META[id].name,
        icon: SHARD_META[id].icon,
        isShard: true
      });
    } else {
      const info = allReforgedRunes[id];
      if (info) {
        if (info.styleId === runeSet.primaryStyleId) {
          primaryPerks.push({
            id: info.id,
            name: info.name,
            icon: info.icon,
            isShard: false
          });
        } else if (info.styleId === runeSet.subStyleId) {
          secondaryPerks.push({
            id: info.id,
            name: info.name,
            icon: info.icon,
            isShard: false
          });
        }
      }
    }
  });

  // Sort them by slot order to match the DDragon layout
  const primaryStyle = runesReforged.find(style => style.id === runeSet.primaryStyleId);
  if (primaryStyle && primaryStyle.slots) {
    primaryPerks.sort((a, b) => {
      const slotA = primaryStyle.slots.findIndex(s => s.runes.some(r => r.id === a.id));
      const slotB = primaryStyle.slots.findIndex(s => s.runes.some(r => r.id === b.id));
      return slotA - slotB;
    });
  }

  const secondaryStyle = runesReforged.find(style => style.id === runeSet.subStyleId);
  if (secondaryStyle && secondaryStyle.slots) {
    secondaryPerks.sort((a, b) => {
      const slotA = secondaryStyle.slots.findIndex(s => s.runes.some(r => r.id === a.id));
      const slotB = secondaryStyle.slots.findIndex(s => s.runes.some(r => r.id === b.id));
      return slotA - slotB;
    });
  }

  // Update original runeSet structures
  runeSet.primaryPerks = primaryPerks;
  runeSet.secondaryPerks = secondaryPerks;
  runeSet.shardsPerks = shardsPerks;

  // Redraw grid
  renderRuneSet(runeSet);

  // Auto-apply if enabled
  if (appConfig.autoApplyRunes) {
    window.api.applyBuild({ runes: runeSet.raw });
  }
}

// Render the complete interactive rune trees grid for a single rune set
function renderRuneSet(runeSet) {
  if (!runeSet) return;

  // Update background ambient glows dynamically to match the primary rune style
  updateAmbientGlowTheme(runeSet.primaryStyleId);

  // Track the active perk IDs in a Set for super-fast lookups
  const activePerkIds = new Set([
    ...runeSet.primaryPerks.map(p => p.id),
    ...runeSet.secondaryPerks.map(p => p.id)
  ]);

  // Primary Tree Header
  elIconPrimaryStyle.src = `https://ddragon.leagueoflegends.com/cdn/img/${runeSet.primaryStyleIcon}`;
  elNamePrimaryStyle.textContent = runeSet.primaryStyleName;

  // Look up primary style in static runesReforged
  const primaryStyle = runesReforged.find(style => style.id === runeSet.primaryStyleId);

  // Render Primary Grid
  elListPrimaryRunes.innerHTML = '';
  if (primaryStyle && primaryStyle.slots) {
    primaryStyle.slots.forEach((slot, slotIndex) => {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'rune-row-grid';
      if (slotIndex === 0) {
        rowDiv.classList.add('keystone-row');
      }

      slot.runes.forEach(rune => {
        const itemDiv = document.createElement('div');
        const isActive = activePerkIds.has(rune.id);

        itemDiv.className = `rune-grid-item style-${runeSet.primaryStyleId} clickable`;
        itemDiv.classList.add(isActive ? 'active' : 'inactive');
        itemDiv.title = `${rune.name}: ${rune.shortDesc}`;

        const img = document.createElement('img');
        img.src = `https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`;
        img.className = slotIndex === 0 ? 'keystone-img' : 'rune-img';
        img.alt = rune.name;

        // click event listener
        itemDiv.addEventListener('click', () => {
          if (isActive) return;

          const primaryStyle = runesReforged.find(style => style.id === runeSet.primaryStyleId);
          if (!primaryStyle || !primaryStyle.slots) return;

          const newPrimaryIds = primaryStyle.slots.map((s, idx) => {
            if (idx === slotIndex) {
              return rune.id;
            }
            const currentActive = runeSet.primaryPerks.find(p => s.runes.some(r => r.id === p.id));
            return currentActive ? currentActive.id : s.runes[0].id;
          });

          const newSecondaryIds = runeSet.secondaryPerks.map(p => p.id);
          const newShardIds = (runeSet.shardsPerks || []).map(p => p.id);

          runeSet.raw.selectedPerkIds = [
            ...newPrimaryIds,
            ...newSecondaryIds,
            ...newShardIds
          ];

          reResolveAndRender(runeSet);
        });

        itemDiv.appendChild(img);
        rowDiv.appendChild(itemDiv);
      });
      elListPrimaryRunes.appendChild(rowDiv);
    });
  } else {
    // Fallback: render vertical rows of selected ones if runesReforged not loaded
    runeSet.primaryPerks.forEach((perk, index) => {
      const isKeystone = index === 0;
      elListPrimaryRunes.appendChild(createRuneRowHtml(perk, isKeystone));
    });
  }

  // Secondary Tree Header
  elIconSubStyle.src = `https://ddragon.leagueoflegends.com/cdn/img/${runeSet.subStyleIcon}`;
  elNameSubStyle.textContent = runeSet.subStyleName;

  // Look up secondary style in static runesReforged
  const secondaryStyle = runesReforged.find(style => style.id === runeSet.subStyleId);

  // Render Secondary Grid
  elListSecondaryRunes.innerHTML = '';
  if (secondaryStyle && secondaryStyle.slots) {
    // Secondary tree ignores keystones slot[0], renders slot[1], slot[2], slot[3]
    for (let slotIndex = 1; slotIndex < secondaryStyle.slots.length; slotIndex++) {
      const slot = secondaryStyle.slots[slotIndex];
      const rowDiv = document.createElement('div');
      rowDiv.className = 'rune-row-grid';

      slot.runes.forEach(rune => {
        const itemDiv = document.createElement('div');
        const isActive = activePerkIds.has(rune.id);

        itemDiv.className = `rune-grid-item style-${runeSet.subStyleId} clickable`;
        itemDiv.classList.add(isActive ? 'active' : 'inactive');
        itemDiv.title = `${rune.name}: ${rune.shortDesc}`;

        const img = document.createElement('img');
        img.src = `https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`;
        img.className = 'rune-img';
        img.alt = rune.name;

        // click event listener
        itemDiv.addEventListener('click', () => {
          let newSecondaryIds = runeSet.secondaryPerks.map(p => p.id);

          if (isActive) {
            newSecondaryIds = newSecondaryIds.filter(id => id !== rune.id);
          } else {
            const slotRuneIds = slot.runes.map(r => r.id);
            const activeInSameSlot = newSecondaryIds.find(id => slotRuneIds.includes(id));

            if (activeInSameSlot) {
              newSecondaryIds = newSecondaryIds.filter(id => id !== activeInSameSlot);
              newSecondaryIds.push(rune.id);
            } else {
              if (newSecondaryIds.length < 2) {
                newSecondaryIds.push(rune.id);
              } else {
                newSecondaryIds.shift();
                newSecondaryIds.push(rune.id);
              }
            }
          }

          // Auto-pad to always have exactly 2 active secondary runes in 2 different slots
          if (newSecondaryIds.length < 2) {
            const occupiedSlotIndex = newSecondaryIds.length === 1
              ? secondaryStyle.slots.findIndex(s => s && s.runes && s.runes.some(r => r.id === newSecondaryIds[0]))
              : -1;

            for (let sIdx = 1; sIdx < secondaryStyle.slots.length; sIdx++) {
              if (sIdx !== occupiedSlotIndex) {
                const fallbackRune = secondaryStyle.slots[sIdx].runes[0];
                if (fallbackRune) {
                  newSecondaryIds.push(fallbackRune.id);
                  if (newSecondaryIds.length === 2) break;
                }
              }
            }
          }

          newSecondaryIds.sort((a, b) => {
            const slotA = secondaryStyle.slots.findIndex(s => s && s.runes && s.runes.some(r => r.id === a));
            const slotB = secondaryStyle.slots.findIndex(s => s && s.runes && s.runes.some(r => r.id === b));
            return slotA - slotB;
          });

          const newPrimaryIds = runeSet.primaryPerks.map(p => p.id);
          const newShardIds = (runeSet.shardsPerks || []).map(p => p.id);

          runeSet.raw.selectedPerkIds = [
            ...newPrimaryIds,
            ...newSecondaryIds,
            ...newShardIds
          ];

          reResolveAndRender(runeSet);
        });

        itemDiv.appendChild(img);
        rowDiv.appendChild(itemDiv);
      });
      elListSecondaryRunes.appendChild(rowDiv);
    }
  } else {
    // Fallback
    runeSet.secondaryPerks.forEach((perk) => {
      elListSecondaryRunes.appendChild(createRuneRowHtml(perk, false));
    });
  }

  // Stat Shards 3x3 Grid
  elListShards.innerHTML = '';

  const shardRowsOptions = [
    [5008, 5005, 5007], // Row 1: Adaptive Force, Attack Speed, Haste
    [5008, 5010, 5011], // Row 2: Adaptive Force, MS, Scaling Health
    [5011, 5013, 5001]  // Row 3: Scaling Health, Tenacity, Flat Health
  ];

  const activeShards = runeSet.shardsPerks || [];
  const shardGridDiv = document.createElement('div');
  shardGridDiv.className = 'shards-grid';

  for (let rowIndex = 0; rowIndex < 3; rowIndex++) {
    const rowOptions = [...shardRowsOptions[rowIndex]];
    const activeShard = activeShards[rowIndex];

    // Fallback swap if active shard is a legacy/non-standard choice
    if (activeShard && !rowOptions.includes(activeShard.id)) {
      rowOptions[2] = activeShard.id;
    }

    const rowDiv = document.createElement('div');
    rowDiv.className = 'shard-row';

    rowOptions.forEach(shardId => {
      const isSelected = activeShard && activeShard.id === shardId;
      const shardInfo = SHARD_META[shardId] || (activeShard && activeShard.id === shardId ? activeShard : { name: `Atributo ${shardId}`, icon: '' });

      const shardItem = document.createElement('div');
      shardItem.className = 'shard-grid-item clickable';
      shardItem.classList.add(isSelected ? 'active' : 'inactive');
      shardItem.title = shardInfo.name;

      const img = document.createElement('img');
      img.src = shardInfo.icon ? `https://ddragon.leagueoflegends.com/cdn/img/${shardInfo.icon}` : 'https://ddragon.leagueoflegends.com/cdn/img/perk-images/StatMods/StatModsAdaptiveForceIcon.png';
      img.className = 'shard-img';
      img.alt = shardInfo.name;

      // click event listener
      shardItem.addEventListener('click', () => {
        if (isSelected) return;

        const newPrimaryIds = runeSet.primaryPerks.map(p => p.id);
        const newSecondaryIds = runeSet.secondaryPerks.map(p => p.id);

        const newShardIds = [0, 1, 2].map(rIdx => {
          if (rIdx === rowIndex) {
            return shardId;
          }
          const currentActive = activeShards[rIdx];
          return currentActive ? currentActive.id : shardRowsOptions[rIdx][0];
        });

        runeSet.raw.selectedPerkIds = [
          ...newPrimaryIds,
          ...newSecondaryIds,
          ...newShardIds
        ];

        reResolveAndRender(runeSet);
      });

      shardItem.appendChild(img);
      rowDiv.appendChild(shardItem);
    });
    shardGridDiv.appendChild(rowDiv);
  }
  elListShards.appendChild(shardGridDiv);
}

// Helper to render a group of item items beautifully
function renderItemGroup(container, itemsList, showPlayrates = false) {
  if (!container) return;
  container.innerHTML = '';
  if (!itemsList || itemsList.length === 0) {
    const emptySpan = document.createElement('span');
    emptySpan.className = 'rune-desc';
    emptySpan.textContent = 'Ninguno';
    container.appendChild(emptySpan);
    return;
  }

  itemsList.forEach(item => {
    const wrapper = document.createElement('div');
    wrapper.className = 'item-wrapper';
    wrapper.setAttribute('data-tooltip', `${item.name} | ${item.gold} oro`);

    const img = document.createElement('img');
    img.src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/item/${item.id}.png`;
    img.className = 'item-icon';
    img.alt = item.name;

    img.onerror = () => {
      if (img.src.includes('ddragon.leagueoflegends.com')) {
        img.src = `https://d3liizu15b1tmi.cloudfront.net/onetricks/16.9.1/img/item/${item.id}.png`;
      } else {
        img.src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/item/3601.png`;
      }
    };

    wrapper.appendChild(img);

    // Show playrate badge if enabled and playrate is provided
    if (showPlayrates && item.playrate !== undefined && item.playrate !== null) {
      const badge = document.createElement('span');
      badge.className = 'item-playrate-badge';

      let prText = item.playrate;
      if (typeof prText === 'number') {
        prText = Math.round(prText);
      }
      if (!String(prText).includes('%')) {
        prText = `${prText}%`;
      }
      badge.textContent = prText;
      wrapper.appendChild(badge);
    }

    container.appendChild(wrapper);
  });
}

// Helper to construct a single visual row element for a rune (kept as fallback)
function createRuneRowHtml(perk, isKeystone) {
  const row = document.createElement('div');
  row.className = 'rune-row' + (isKeystone ? ' keystone' : '');
  row.title = perk.name;

  const iconBox = document.createElement('div');
  iconBox.className = 'rune-img-container';

  const img = document.createElement('img');
  img.src = `https://ddragon.leagueoflegends.com/cdn/img/${perk.icon}`;
  img.className = 'rune-img';
  img.alt = perk.name;
  iconBox.appendChild(img);

  const meta = document.createElement('div');
  meta.className = 'rune-meta';

  const name = document.createElement('div');
  name.className = 'rune-name';
  name.textContent = perk.name;

  const desc = document.createElement('div');
  desc.className = 'rune-desc';
  desc.textContent = perk.desc;

  meta.appendChild(name);
  meta.appendChild(desc);

  row.appendChild(iconBox);
  row.appendChild(meta);

  return row;
}

// Render the clickable list of summoner options
function renderSummonerOptions(options) {
  elListSpells.innerHTML = '';
  elListSpells.className = 'runes-list vertical-spells-list';

  options.forEach((opt, idx) => {
    const row = document.createElement('div');
    const isActive = idx === selectedSummonerIndex;
    row.className = 'summoners-row' + (isActive ? ' active' : '');
    row.title = `Hechizos: ${opt.spell1.name} + ${opt.spell2.name} (${opt.playrate}% Playrate)`;
    row.setAttribute('data-index', idx);

    const pairDiv = document.createElement('div');
    pairDiv.className = 'summoners-spells-pair';

    // Spell 1
    const s1Div = document.createElement('div');
    s1Div.className = 'spell-icon-mini-container';
    const s1Img = document.createElement('img');
    s1Img.src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/spell/${opt.spell1.icon}`;
    s1Img.alt = opt.spell1.name;
    s1Div.appendChild(s1Img);

    // Spell 2
    const s2Div = document.createElement('div');
    s2Div.className = 'spell-icon-mini-container';
    const s2Img = document.createElement('img');
    s2Img.src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/spell/${opt.spell2.icon}`;
    s2Img.alt = opt.spell2.name;
    s2Div.appendChild(s2Img);

    pairDiv.appendChild(s1Div);
    pairDiv.appendChild(s2Div);

    const playrateSpan = document.createElement('span');
    playrateSpan.className = 'summoners-playrate';
    playrateSpan.textContent = `${opt.playrate}%`;

    row.appendChild(pairDiv);
    row.appendChild(playrateSpan);

    row.addEventListener('click', () => {
      selectSummonersOption(idx);
    });

    elListSpells.appendChild(row);
  });
}

// Select summoner option and auto-apply it
function selectSummonersOption(idx) {
  if (!activeScrapedData || !activeScrapedData.summonersOptions || !activeScrapedData.summonersOptions[idx]) return;

  selectedSummonerIndex = idx;
  const selectedOpt = activeScrapedData.summonersOptions[idx];

  // Update activeScrapedData.summoners so manual apply works with the chosen spells
  activeScrapedData.summoners = selectedOpt;

  // Visually toggle active rows
  const rows = elListSpells.querySelectorAll('.summoners-row');
  rows.forEach((row, i) => {
    row.classList.toggle('active', i === idx);
  });

  // Auto-apply if enabled
  if (appConfig.autoApplySpells) {
    window.api.applyBuild({ summoners: selectedOpt.raw });
  }
}

// ==========================================================================
// AUTO-UPDATER EVENTS & UI LOGIC BINDINGS
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  const elBtnCheckUpdates = document.getElementById('btn-check-updates');
  const elUpdateStatusMsg = document.getElementById('update-status-message');
  const elVersionLabel = document.getElementById('update-version-label');
  const elUpdateActionContainer = document.getElementById('update-action-container');
  
  if (elVersionLabel) {
    elVersionLabel.textContent = `Versión actual: v${appVersion}`;
  }

  // Helper to update settings status area
  function setUpdateStatus(text) {
    if (elUpdateStatusMsg) {
      elUpdateStatusMsg.innerHTML = text;
    }
  }

  // Bind click handlers
  if (elBtnCheckUpdates) {
    elBtnCheckUpdates.addEventListener('click', () => {
      sfx.playTick();
      elBtnCheckUpdates.disabled = true;
      elBtnCheckUpdates.textContent = 'Buscando...';
      setUpdateStatus('Buscando actualizaciones...');
      window.api.checkForUpdates();
    });
  }

  // Auto-updater event hookups from preload IPC
  if (window.api.onCheckingForUpdate) {
    window.api.onCheckingForUpdate(() => {
      console.log('[UI] Checking for updates...');
      setUpdateStatus('Buscando actualizaciones en el servidor...');
    });
  }

  if (window.api.onUpdateAvailable) {
    window.api.onUpdateAvailable((info) => {
      console.log('[UI] Update available:', info);
      const newVersion = info ? info.version : '';
      setUpdateStatus(`Nueva versión disponible: <span style="color:var(--accent-blue);font-weight:700;">v${newVersion}</span>. Descargando...`);
      
      // Inject download progress bar inside update-action-container!
      if (elUpdateActionContainer) {
        elUpdateActionContainer.innerHTML = `
          <div class="update-progress-bar-container" style="width: 140px;">
            <div class="update-progress-bar-fill" id="update-progress-fill" style="width: 0%;"></div>
          </div>
        `;
      }
    });
  }

  if (window.api.onUpdateNotAvailable) {
    window.api.onUpdateNotAvailable((info) => {
      console.log('[UI] Already up to date:', info);
      setUpdateStatus('La aplicación se encuentra en su versión más reciente.');
      restoreCheckButton();
    });
  }

  if (window.api.onUpdateError) {
    window.api.onUpdateError((err) => {
      console.error('[UI] Update error:', err);
      const errMsg = err ? `: ${err}` : '';
      setUpdateStatus(`<span style="color:var(--status-red);">Error al buscar actualizaciones${errMsg}</span>`);
      restoreCheckButton();
    });
  }

  if (window.api.onDownloadProgress) {
    window.api.onDownloadProgress((progress) => {
      const percent = progress.percent || 0;
      setUpdateStatus(`Descargando actualización... <span style="font-weight:700;color:var(--accent-purple-light);">${percent}%</span>`);
      const fill = document.getElementById('update-progress-fill');
      if (fill) {
        fill.style.width = `${percent}%`;
      }
    });
  }

  if (window.api.onUpdateDownloaded) {
    window.api.onUpdateDownloaded((info) => {
      const newVersion = info ? info.version : '';
      console.log('[UI] Update downloaded:', info);
      setUpdateStatus(`¡Versión <span style="color:var(--status-green);font-weight:700;">v${newVersion}</span> lista! Se instalará automáticamente al cerrar el cliente.`);
      
      // Add a Restart button in Settings too (non-intrusive)
      if (elUpdateActionContainer) {
        elUpdateActionContainer.innerHTML = `
          <button class="btn btn-primary compact" id="btn-settings-restart" style="padding: 8px 16px; font-size: 11px; font-weight: 700; font-family: var(--font-display); text-transform: uppercase; border-radius: 8px; border: 1px solid rgba(138,43,226,0.3); background: linear-gradient(135deg, rgba(138,43,226,0.35) 0%, rgba(0,191,255,0.2) 100%); color: #fff; cursor: pointer;">Reiniciar</button>
        `;
        const btnSettingsRestart = document.getElementById('btn-settings-restart');
        if (btnSettingsRestart) {
          btnSettingsRestart.addEventListener('click', () => {
            sfx.playApply();
            window.api.restartAndInstall();
          });
        }
      }
    });
  }

  function restoreCheckButton() {
    if (elUpdateActionContainer && elBtnCheckUpdates) {
      elUpdateActionContainer.innerHTML = '';
      elUpdateActionContainer.appendChild(elBtnCheckUpdates);
      elBtnCheckUpdates.disabled = false;
      elBtnCheckUpdates.textContent = 'Buscar actualizaciones';
    }
  }
});

// Render dynamic Valorant player profile card on Welcome & Workspace screens
function updateValorantPlayerProfileUI(playerInfo) {
  const elWelcomeValContainer = document.getElementById('welcome-val-profile-container');
  const elWorkspaceValContainer = document.getElementById('workspace-val-profile-container');

  if (!playerInfo) {
    if (elWelcomeValContainer) elWelcomeValContainer.innerHTML = '';
    if (elWorkspaceValContainer) {
      elWorkspaceValContainer.innerHTML = '';
      elWorkspaceValContainer.style.display = 'none';
    }
    return;
  }

  const rankClass = `rank-val-${playerInfo.tier}`;
  const translatedTier = playerInfo.tierName || 'UNRANKED';

  const tierLabel = playerInfo.tier === 0
    ? 'SIN CLASIFICAR'
    : `${translatedTier} (${playerInfo.lp} RR)`;

  // Tracker.gg URL
  const trackerUrl = `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(playerInfo.displayName)}/`;

  let badgeHtml = '';
  if (playerInfo.tierIcon) {
    badgeHtml = `<img class="rank-badge-icon" src="${playerInfo.tierIcon}" alt="${playerInfo.tierName}" style="width: 20px; height: 20px; object-fit: contain;">`;
  } else {
    badgeHtml = `<span style="font-size: 14px;">❓</span>`;
  }

  // Welcome Screen: Sleek wide banner card using Riot Player Card Wide Art
  const cardId = (playerInfo.playerCardId || '9fb348bc-41a0-91ad-8a3e-818035c4e561').toLowerCase();

  const bannerUrl = `https://media.valorant-api.com/playercards/${cardId}/wideart.png`;

  const cachedStyle = playerInfo.isCached ? 'opacity: 0.65; filter: grayscale(0.2); transition: all 0.3s ease;' : '';
  const welcomeCardHtml = `
    <div class="player-profile-card ${rankClass}" style="margin-top: 12px; height: 72px; position: relative; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255, 70, 85, 0.25); box-shadow: 0 4px 20px rgba(255, 70, 85, 0.1); ${cachedStyle}">
      <!-- Wide Banner Background -->
      <img src="${bannerUrl}" onerror="this.onerror=null; this.src='https://media.valorant-api.com/playercards/9fb348bc-41a0-91ad-8a3e-818035c4e561/wideart.png';" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: brightness(0.45); z-index: 1; pointer-events: none;">
      <div class="rank-bg-glow" style="z-index: 2;"></div>
      
      <div class="profile-card-content" style="position: relative; z-index: 3; display: flex; align-items: center; justify-content: space-between; height: 100%; padding: 0 20px; box-sizing: border-box;">
        <a class="profile-link-wrapper" href="${trackerUrl}" target="_blank" title="Ver perfil en Valorant-Tracker" style="display: flex; flex: 1; align-items: center; justify-content: space-between; text-decoration: none; color: inherit;">
          <div class="profile-info" style="display: flex; flex-direction: column; gap: 2px;">
            <span class="profile-name" style="font-size: 14px; font-weight: 800; font-family: var(--font-display); color: #fff; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);">${playerInfo.displayName}</span>
            <div class="rank-badge-row" style="display: flex; align-items: center; gap: 6px; font-family: var(--font-display);">
              <span class="profile-stats" style="font-size: 10.5px; font-weight: 800; color: #ff4655; background: rgba(0, 0, 0, 0.6); padding: 2px 8px; border-radius: 4px; text-shadow: none; white-space: nowrap; border: 1px solid rgba(255, 70, 85, 0.25);">
                ${playerInfo.games > 0 ? `${playerInfo.winrate}% WR` : '0% WR'}
              </span>
            </div>
          </div>
          <div class="player-rank" style="display: flex; align-items: center; gap: 8px; background: rgba(0, 0, 0, 0.65); padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05); backdrop-filter: blur(4px); box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);">
            ${badgeHtml}
            <div style="display: flex; flex-direction: column; line-height: 1.1; text-align: left;">
              <span class="rank-badge-text" style="font-size: 9.5px; font-weight: 800; color: #fff; text-transform: uppercase; letter-spacing: 0.3px;">${playerInfo.tierName || 'UNRANKED'}</span>
              ${playerInfo.tier > 0 ? `<span class="rank-lp" style="font-size: 8px; color: var(--text-secondary); font-weight: 600;">${playerInfo.lp} RR</span>` : ''}
            </div>
          </div>
        </a>
      </div>
    </div>
  `;

  // Workspace: Compact layout with Agent Avatar fitting the left column
  const valLogoSrc = `https://media.valorant-api.com/playercards/${cardId}/displayicon.png`;

  const workspaceCardHtml = `
    <div class="player-profile-card ${rankClass}" style="margin-top: 10px;">
      <div class="rank-bg-glow"></div>
      <div class="profile-card-content">
        <div class="avatar-wrapper">
          <img class="profile-avatar val-agent-icon" src="${valLogoSrc}" alt="Valorant Profile" onerror="this.onerror=null; this.src='https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/displayicon.png';" style="border-color: rgba(255, 255, 255, 0.15); padding: 1px; border-radius: 50%;">
        </div>
        <a class="profile-link-wrapper" href="${trackerUrl}" target="_blank" title="Ver perfil en Valorant-Tracker" style="display: flex; flex: 1; align-items: center; justify-content: space-between;">
          <div class="profile-info">
            <span class="profile-name" style="font-size: 13.5px;">${playerInfo.displayName}</span>
            <div class="rank-badge-row" style="display: flex; align-items: center; gap: 8px; margin-top: 3px; font-family: var(--font-display);">
              <span class="profile-stats" style="font-size: 10px; font-weight: 700; color: var(--text-secondary); margin-top: 0; white-space: nowrap;">
                ${playerInfo.games > 0 ? `${playerInfo.winrate}% WR (${playerInfo.games} Partidas)` : '0% WR (0 Partidas)'}
              </span>
              ${playerInfo.headshotPct > 0 ? `
                <span style="font-size: 10px; color: rgba(255,255,255,0.15);">|</span>
                <span style="font-size: 10px; color: #ff4655; font-weight: 800; letter-spacing: 0.3px; white-space: nowrap;">${playerInfo.headshotPct}% HS</span>
              ` : ''}
              ${playerInfo.adr > 0 ? `
                <span style="font-size: 10px; color: rgba(255,255,255,0.15);">|</span>
                <span style="font-size: 10px; color: var(--accent-blue); font-weight: 800; letter-spacing: 0.3px; white-space: nowrap;">${playerInfo.adr} ADR</span>
              ` : ''}
            </div>
          </div>
          <div class="player-rank" style="display: flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.25); padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.03);">
            ${badgeHtml}
            <div style="display: flex; flex-direction: column; line-height: 1.1; text-align: left;">
              <span class="rank-badge-text" style="font-size: 9.5px; font-weight: 800; color: #fff; text-transform: uppercase;">${playerInfo.tierName || 'UNRANKED'}</span>
              ${playerInfo.tier > 0 ? `<span class="rank-lp" style="font-size: 8px; color: var(--text-secondary); font-weight: 600;">${playerInfo.lp} RR</span>` : ''}
            </div>
          </div>
        </a>
      </div>
    </div>
  `;

  if (elWelcomeValContainer) {
    elWelcomeValContainer.innerHTML = welcomeCardHtml;
  }
  if (elWorkspaceValContainer) {
    elWorkspaceValContainer.innerHTML = '';
    elWorkspaceValContainer.style.display = 'none';
  }
}

// Dynamic active user presence counter logic
async function initActiveUserCounter() {
  const elCounter = document.getElementById('active-user-count');
  if (!elCounter) return;

  const PING_SERVER_URL = 'https://onetricks-client.onrender.com';

  // Retrieve or generate a persistent anonymous client ID
  let clientId = localStorage.getItem('onetricks_client_id');
  if (!clientId) {
    clientId = 'client_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('onetricks_client_id', clientId);
  }

  let usingMockFallback = false;
  let simulatedUsers = 12 + Math.floor(Math.random() * 8); // Fallback mock baseline

  async function sendPing() {
    try {
      const response = await fetch(`${PING_SERVER_URL}/ping?id=${clientId}`);
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data.activeUsers === 'number') {
          usingMockFallback = false;
          elCounter.textContent = data.activeUsers.toLocaleString(currentLang === 'en' ? 'en-US' : 'es-ES');
          return;
        }
      }
      throw new Error("Invalid response");
    } catch (err) {
      // If the ping fails (e.g. server not deployed or offline), we use our fallback simulation
      usingMockFallback = true;
      const delta = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
      simulatedUsers = Math.max(8, simulatedUsers + delta);
      elCounter.textContent = simulatedUsers.toLocaleString(currentLang === 'en' ? 'en-US' : 'es-ES');
    }
  }

  // Send first ping immediately
  await sendPing();

  // Periodic ping interval every 30 seconds
  setInterval(async () => {
    await sendPing();
  }, 30000);
}
