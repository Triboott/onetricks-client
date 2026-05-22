const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');
const WebSocket = require('ws');

class LcuConnector {
  constructor({ customPath, onStatusChange, onChampSelectUpdate }) {
    this.customPath = customPath || '';
    this.onStatusChange = onStatusChange || (() => {});
    this.onChampSelectUpdate = onChampSelectUpdate || (() => {});

    this.port = null;
    this.password = null;
    this.protocol = 'https';
    this.status = 'disconnected'; // 'disconnected', 'scanning', 'connected'

    this.scanInterval = null;
    this.ws = null;
    this.lockfilePath = null;
  }

  setCustomPath(newPath) {
    this.customPath = newPath;
    if (this.status !== 'connected') {
      this.restartScan();
    }
  }

  start() {
    this.restartScan();
  }

  stop() {
    this.stopScan();
    this.disconnectWs();
  }

  restartScan() {
    this.stopScan();
    this.scanInterval = setInterval(() => this.scan(), 2000);
    this.scan(); // immediate run
  }

  stopScan() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  async scan() {
    if (this.status === 'connected') return;

    this.updateStatus('scanning');

    // Try to auto-detect using PowerShell process query first
    const pathFromProcess = await this.detectPathFromProcess();
    
    let possiblePaths = [];
    if (pathFromProcess) {
      possiblePaths.push(path.join(pathFromProcess, 'lockfile'));
    }
    if (this.customPath) {
      possiblePaths.push(path.join(this.customPath, 'lockfile'));
      possiblePaths.push(this.customPath); // if they selected lockfile itself
    }
    // Check workspace/current directory (for development & mock testing)
    possiblePaths.push(path.join(__dirname, 'lockfile'));
    possiblePaths.push(path.join(process.cwd(), 'lockfile'));
    
    // Standard default paths on multiple drives
    possiblePaths.push('C:\\Riot Games\\League of Legends\\lockfile');
    possiblePaths.push('D:\\Riot Games\\League of Legends\\lockfile');
    possiblePaths.push('E:\\Riot Games\\League of Legends\\lockfile');
    possiblePaths.push('F:\\Riot Games\\League of Legends\\lockfile');
    possiblePaths.push('C:\\Games\\Riot Games\\League of Legends\\lockfile');
    possiblePaths.push('D:\\Games\\Riot Games\\League of Legends\\lockfile');
    possiblePaths.push('E:\\Games\\Riot Games\\League of Legends\\lockfile');

    for (const p of possiblePaths) {
      if (fs.existsSync(p) && fs.lstatSync(p).isFile()) {
        try {
          const contents = fs.readFileSync(p, 'utf8');
          const parts = contents.split(':');
          if (parts.length >= 5) {
            this.port = parts[2];
            this.password = parts[3];
            this.protocol = parts[4];
            this.lockfilePath = p;
            
            // Validate connection before asserting success
            const ok = await this.testConnection();
            if (ok) {
              this.stopScan();
              this.updateStatus('connected');
              this.connectWs();
              return;
            }
          }
        } catch (e) {
          // ignore read errors
        }
      }
    }
  }

  detectPathFromProcess() {
    return new Promise((resolve) => {
      exec('powershell -Command "Get-Process LeagueClientUx, LeagueClient -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Path -ErrorAction SilentlyContinue | Select-Object -First 1"', (err, stdout) => {
        if (!err && stdout && stdout.trim()) {
          const fullPath = stdout.trim();
          resolve(path.dirname(fullPath));
        } else {
          resolve(null);
        }
      });
    });
  }

  updateStatus(newStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.onStatusChange(newStatus);
    }
  }

  async testConnection() {
    try {
      await this.request('GET', '/lol-login/v1/session');
      return true;
    } catch (e) {
      return false;
    }
  }

  // Generic LCU HTTPS Request
  request(method, endpoint, body = null) {
    return new Promise((resolve, reject) => {
      if (!this.port || !this.password) {
        return reject(new Error('LCU not connected'));
      }

      const options = {
        hostname: '127.0.0.1',
        port: this.port,
        path: endpoint,
        method: method,
        rejectUnauthorized: false, // self-signed SSL cert bypass
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`riot:${this.password}`).toString('base64'),
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          let parsedData = null;
          if (rawData) {
            try {
              parsedData = JSON.parse(rawData);
            } catch (e) {
              parsedData = rawData;
            }
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsedData);
          } else {
            reject(new Error(`LCU request failed with status code ${res.statusCode}: ${rawData}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  // WebSocket connection for real-time events subscription
  connectWs() {
    this.disconnectWs();

    const wsUrl = `wss://127.0.0.1:${this.port}`;
    console.log(`[LCU] Connecting to WS: ${wsUrl}`);
    this.ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`riot:${this.password}`).toString('base64')
      },
      rejectUnauthorized: false
    });

    this.ws.on('open', () => {
      console.log('[LCU] WS Connected successfully');
      // Subscribe to all API events
      this.ws.send(JSON.stringify([5, "OnJsonApiEvent"]));
      // Check immediately for current session
      this.pollChampSelect();
    });

    this.ws.on('message', (message) => {
      try {
        const [id, eventName, payload] = JSON.parse(message);
        console.log(`[LCU] WS Message: eventName=${eventName}, uri=${payload.uri}, eventType=${payload.eventType}`);
        if (eventName === 'OnJsonApiEvent' && payload.uri === '/lol-champ-select/v1/session') {
          if (payload.eventType === 'Delete') {
            this.onChampSelectUpdate(null);
          } else {
            this.onChampSelectUpdate(payload.data);
          }
        }
      } catch (err) {
        // parsing issues
      }
    });

    this.ws.on('close', (code, reason) => {
      console.log(`[LCU] WS Closed: code=${code}, reason=${reason}`);
      this.handleDisconnect();
    });

    this.ws.on('error', (err) => {
      console.error('[LCU] WS Error:', err);
      this.handleDisconnect();
    });
  }

  disconnectWs() {
    if (this.ws) {
      try {
        this.ws.terminate();
      } catch (e) {}
      this.ws = null;
    }
  }

  handleDisconnect() {
    this.disconnectWs();
    this.updateStatus('disconnected');
    this.onChampSelectUpdate(null);
    this.restartScan();
  }

  async pollChampSelect() {
    try {
      const session = await this.request('GET', '/lol-champ-select/v1/session');
      this.onChampSelectUpdate(session);
    } catch (e) {
      // Not in champion select
      this.onChampSelectUpdate(null);
    }
  }

  // API Methods
  async applyRunes(runes) {
    try {
      // Get all current pages
      const pages = await this.request('GET', '/lol-perks/v1/pages');
      
      // Find an editable page
      const editablePage = pages.find(p => p.isEditable);
      
      // If we have an editable page, delete it first to free up slot and ensure clean sync
      if (editablePage) {
        console.log(`[LCU] Deleting existing editable rune page: ID ${editablePage.id}`);
        try {
          await this.request('DELETE', `/lol-perks/v1/pages/${editablePage.id}`);
        } catch (e) {
          console.warn('[LCU] Failed to delete old rune page, proceeding to create anyway:', e);
        }
      }

      const payload = {
        name: `OT: ${runes.name}`,
        primaryStyleId: runes.primaryStyleId,
        subStyleId: runes.subStyleId,
        selectedPerkIds: runes.selectedPerkIds,
        current: true // automatically set active
      };

      console.log(`[LCU] Creating new rune page: "${payload.name}"`);
      const newPage = await this.request('POST', '/lol-perks/v1/pages', payload);
      
      if (newPage && newPage.id) {
        console.log(`[LCU] Rune page created successfully with ID: ${newPage.id}`);
        try {
          // Secondary fallback to guarantee active page update
          await this.request('PUT', '/lol-perks/v1/activepage', newPage.id);
        } catch (e) {
          // ignore active page errors since current: true in POST usually handles it
        }
      }
      
      console.log(`Applied runes for ${runes.name} successfully.`);
      return true;
    } catch (err) {
      console.error('Failed to apply runes:', err);
      throw err;
    }
  }

  async applySummonerSpells(summoners) {
    try {
      const payload = {
        spell1Id: summoners.spell1Id,
        spell2Id: summoners.spell2Id
      };
      await this.request('PATCH', '/lol-champ-select/v1/session/my-selection', payload);
      console.log(`Applied summoner spells: ${summoners.spell1Id}, ${summoners.spell2Id} successfully.`);
      return true;
    } catch (err) {
      console.error('Failed to apply summoners:', err);
      throw err;
    }
  }

  async applyItemSet(championId, championName, items) {
    try {
      console.log(`[LCU] Preparing item set for champion ID: ${championId} (${championName})`);
      
      // 1. Get current summoner
      const summoner = await this.request('GET', '/lol-summoner/v1/current-summoner');
      if (!summoner || !summoner.summonerId) {
        throw new Error('Summoner ID not found');
      }

      const summonerId = summoner.summonerId;

      // 2. Get current item sets
      let setsData = await this.request('GET', `/lol-item-sets/v1/item-sets/${summonerId}/sets`);
      if (!setsData || typeof setsData !== 'object') {
        setsData = {
          accountId: summoner.accountId || 0,
          timestamp: Date.now(),
          itemSets: []
        };
      }
      if (!setsData.itemSets) {
        setsData.itemSets = [];
      }

      // 3. Construct blocks from scraped items
      const blocks = [];

      if (items.startingBuild && items.startingBuild.length > 0) {
        blocks.push({
          type: 'Objetos Iniciales',
          hideIfSummonerSpell: '',
          showIfSummonerSpell: '',
          items: items.startingBuild.map(it => ({ id: String(it.id), count: 1 }))
        });
      }

      if (items.popularBoots && items.popularBoots.length > 0) {
        blocks.push({
          type: 'Botas',
          hideIfSummonerSpell: '',
          showIfSummonerSpell: '',
          items: items.popularBoots.map(it => ({ id: String(it.id), count: 1 }))
        });
      }

      if (items.coreItems && items.coreItems.length > 0) {
        const firstThreeCore = items.coreItems.slice(0, 3);
        if (firstThreeCore.length > 0) {
          blocks.push({
            type: 'Core Inicial (Primeros 3 Objetos)',
            hideIfSummonerSpell: '',
            showIfSummonerSpell: '',
            items: firstThreeCore.map(it => ({ id: String(it.id), count: 1 }))
          });
        }

        const remainingCore = items.coreItems.slice(3);
        if (remainingCore.length > 0) {
          blocks.push({
            type: 'Objetos Situacionales / Siguientes',
            hideIfSummonerSpell: '',
            showIfSummonerSpell: '',
            items: remainingCore.map(it => ({ id: String(it.id), count: 1 }))
          });
        }
      }

      if (blocks.length === 0) {
        console.log('[LCU] No items to apply for item set.');
        return false;
      }

      // 4. Create new item set object
      const title = `OT: ${championName}`;
      const newSet = {
        title: title,
        type: 'custom',
        map: 'any',
        mode: 'any',
        priority: true,
        sortrank: 0,
        uid: `ot-set-${championId}`,
        associatedChampions: [championId],
        associatedMaps: [],
        blocks: blocks
      };

      // 5. Remove existing set for this champion to prevent duplication
      setsData.itemSets = setsData.itemSets.filter(set => {
        if (set.uid === newSet.uid || set.title === title) return false;
        if (set.associatedChampions && set.associatedChampions.includes(championId)) return false;
        return true;
      });

      // 6. Add our new set
      setsData.itemSets.push(newSet);
      setsData.timestamp = Date.now();

      // 7. Push back to LCU
      await this.request('PUT', `/lol-item-sets/v1/item-sets/${summonerId}/sets`, setsData);
      console.log(`[LCU] Successfully applied custom item set for ${championName}`);
      return true;
    } catch (err) {
      console.error('Failed to apply item set:', err);
      return false;
    }
  }

  async getCurrentSummoner() {
    return await this.request('GET', '/lol-summoner/v1/current-summoner');
  }

  async getRankedStats() {
    return await this.request('GET', '/lol-ranked/v1/current-ranked-stats');
  }
}

module.exports = LcuConnector;
