const DiscordRPC = require('discord-rpc');

class DiscordRPCManager {
  constructor() {
    this.clientId = '1509176597108883588'; // Custom user application ID
    this.client = null;
    this.enabled = false;
    this.connected = false;
    this.reconnectInterval = null;
    
    // Cache the last requested activity so we can immediately apply it upon successful connection
    this.lastActivity = {
      details: 'Waiting for game...',
      state: 'Idle',
      largeImageKey: 'app_icon',
      largeImageText: 'Onetricks Client',
      startTimestamp: null
    };
  }

  /**
   * Initialize and start the RPC manager based on saved settings
   * @param {boolean} initiallyEnabled Whether the feature is turned on in config
   */
  init(initiallyEnabled) {
    console.log(`[DISCORD-RPC] Initializing manager. Enabled = ${initiallyEnabled}`);
    this.setEnabled(initiallyEnabled);
  }

  /**
   * Enable or disable the RPC integration dynamically
   * @param {boolean} isEnabled 
   */
  setEnabled(isEnabled) {
    this.enabled = !!isEnabled;
    
    if (this.enabled) {
      this.startReconnectionLoop();
    } else {
      this.shutdown();
    }
  }

  /**
   * Start or resume background reconnection checking
   */
  startReconnectionLoop() {
    if (this.reconnectInterval) return;

    // Try connecting immediately
    this.connect();

    // Periodically check/retry connection in background
    this.reconnectInterval = setInterval(() => {
      if (this.enabled && !this.connected) {
        console.log('[DISCORD-RPC] Retrying background connection to Discord...');
        this.connect();
      }
    }, 15000); // 15 seconds retry interval
  }

  /**
   * Attempt connection to local Discord client IPC socket
   */
  connect() {
    if (this.connected || !this.enabled) return;

    try {
      this.client = new DiscordRPC.Client({ transport: 'ipc' });

      this.client.on('ready', () => {
        console.log('[DISCORD-RPC] Client connected successfully and ready.');
        this.connected = true;
        this.applyActivity(this.lastActivity);
      });

      this.client.on('error', (err) => {
        console.error('[DISCORD-RPC] Client encountered socket error:', err.message);
        this.handleDisconnect();
      });

      // Attempt login
      this.client.login({ clientId: this.clientId }).catch((err) => {
        // Catch silently, e.g., if Discord is closed, to prevent crashes
        console.log('[DISCORD-RPC] Failed connection login (Discord is likely closed).');
        this.handleDisconnect();
      });
    } catch (e) {
      console.error('[DISCORD-RPC] Critical error during connection setup:', e.message);
      this.handleDisconnect();
    }
  }

  /**
   * Handles local cleanup and state resets on disconnect
   */
  handleDisconnect() {
    this.connected = false;
    if (this.client) {
      try {
        this.client.destroy().catch(() => {});
      } catch (e) {}
      this.client = null;
    }
  }

  /**
   * Gracefully disconnect and stop background timers
   */
  shutdown() {
    console.log('[DISCORD-RPC] Shutting down Discord RPC...');
    
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    this.handleDisconnect();
  }

  /**
   * Public interface to update activity details. Handles English/Spanish localized buttons.
   */
  updateActivity(details, state, largeImageKey, largeImageText, smallImageKey, smallImageText, startTimestamp, lang = 'en') {
    // Cache the activity in memory in case we need to reconnect and apply it
    this.lastActivity = {
      details,
      state,
      largeImageKey,
      largeImageText,
      smallImageKey,
      smallImageText,
      startTimestamp,
      lang
    };

    if (this.connected && this.enabled) {
      this.applyActivity(this.lastActivity);
    }
  }

  /**
   * Internal wrapper to structure payload and send to the active Discord IPC socket
   */
  applyActivity(act) {
    if (!this.client || !this.connected) return;

    try {
      const buttonLabel = act.lang === 'es' ? 'Descargar Onetricks Client' : 'Download Onetricks Client';
      
      const payload = {
        details: act.details,
        state: act.state,
        largeImageKey: act.largeImageKey || 'app_icon',
        largeImageText: act.largeImageText || 'Onetricks Client',
        buttons: [
          { label: buttonLabel, url: 'https://triboott.github.io/onetricks-client/' }
        ]
      };

      if (act.smallImageKey) {
        payload.smallImageKey = act.smallImageKey;
      }
      if (act.smallImageText) {
        payload.smallImageText = act.smallImageText;
      }
      if (act.startTimestamp) {
        payload.startTimestamp = act.startTimestamp;
      }

      this.client.setActivity(payload).catch((err) => {
        console.warn('[DISCORD-RPC] Failed to set activity:', err.message);
      });
    } catch (err) {
      console.warn('[DISCORD-RPC] Error applying activity details:', err.message);
    }
  }

  /**
   * Clear current Discord status activity
   */
  clearActivity() {
    if (this.client && this.connected) {
      try {
        this.client.clearActivity().catch(() => {});
      } catch (e) {}
    }
  }
}

module.exports = new DiscordRPCManager();
