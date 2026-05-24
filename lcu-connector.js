const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');
const WebSocket = require('ws');

class LcuConnector {
  constructor({ customPath, onStatusChange, onChampSelectUpdate, onGameflowPhaseUpdate }) {
    this.customPath = customPath || '';
    this.onStatusChange = onStatusChange || (() => {});
    this.onChampSelectUpdate = onChampSelectUpdate || (() => {});
    this.onGameflowPhaseUpdate = onGameflowPhaseUpdate || (() => {});

    this.port = null;
    this.password = null;
    this.protocol = 'https';
    this.status = 'disconnected'; // 'disconnected', 'scanning', 'connected'

    this.scanInterval = null;
    this.ws = null;
    this.lockfilePath = null;
    
    // Caching and performance optimization fields
    this.lastKnownPath = null;
    this.lastProcessScanTime = 0;
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
    this.port = null;
    this.password = null;
    this.status = 'disconnected';
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

    let possiblePaths = [];

    // 1. Try last known working path first for instant reconnection!
    if (this.lastKnownPath) {
      possiblePaths.push(this.lastKnownPath);
    }
    
    // 2. Check workspace/current directory first (for development & mock testing)
    possiblePaths.push(path.join(__dirname, 'lockfile'));
    possiblePaths.push(path.join(process.cwd(), 'lockfile'));

    if (this.customPath) {
      possiblePaths.push(path.join(this.customPath, 'lockfile'));
      possiblePaths.push(this.customPath); // if they selected lockfile itself
    }
    
    // 3. Standard default paths on multiple drives (very cheap, 0% CPU)
    possiblePaths.push('C:\\Riot Games\\League of Legends\\lockfile');
    possiblePaths.push('D:\\Riot Games\\League of Legends\\lockfile');
    possiblePaths.push('E:\\Riot Games\\League of Legends\\lockfile');
    possiblePaths.push('F:\\Riot Games\\League of Legends\\lockfile');
    possiblePaths.push('C:\\Games\\Riot Games\\League of Legends\\lockfile');
    possiblePaths.push('D:\\Games\\Riot Games\\League of Legends\\lockfile');
    possiblePaths.push('E:\\Games\\Riot Games\\League of Legends\\lockfile');

    // Check if any of these cheap paths already have a lockfile
    let foundLockfile = false;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        foundLockfile = true;
        break;
      }
    }

    // 4. Try to auto-detect using PowerShell process query only if no lockfile was found on standard/cheap paths
    // AND at least 15 seconds have passed since the last process scan (throttling)
    const now = Date.now();
    if (!foundLockfile && (now - this.lastProcessScanTime > 15000)) {
      this.lastProcessScanTime = now;
      console.log('[LCU] Throttled process query active. Searching for League processes...');
      const pathFromProcess = await this.detectPathFromProcess();
      if (pathFromProcess) {
        const procLockfilePath = path.join(pathFromProcess, 'lockfile');
        possiblePaths.push(procLockfilePath);
      }
    }

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
              this.lastKnownPath = p; // Cache the successful path!
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
      // Check immediately for current session and phase
      this.pollChampSelect();
      this.pollGameflowPhase();
    });

    this.ws.on('message', (message) => {
      try {
        const [id, eventName, payload] = JSON.parse(message);
        // Cleaned up verbose LCU WS logging to save CPU during active gameplay
        // console.log(`[LCU] WS Message: eventName=${eventName}, uri=${payload.uri}, eventType=${payload.eventType}`);
        if (eventName === 'OnJsonApiEvent') {
          if (payload.uri === '/lol-champ-select/v1/session') {
            if (payload.eventType === 'Delete') {
              this.onChampSelectUpdate(null);
            } else {
              this.onChampSelectUpdate(payload.data);
            }
          } else if (payload.uri === '/lol-gameflow/v1/gameflow-phase') {
            this.onGameflowPhaseUpdate(payload.data);
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
    this.onGameflowPhaseUpdate('None');
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

  async pollGameflowPhase() {
    try {
      const phase = await this.request('GET', '/lol-gameflow/v1/gameflow-phase');
      this.onGameflowPhaseUpdate(phase);
    } catch (e) {
      this.onGameflowPhaseUpdate('None');
    }
  }

  // API Methods
  async applyRunes(runes) {
    try {
      // Get all current pages
      const pages = await this.request('GET', '/lol-perks/v1/pages');
      
      // 1. Try to find a page we created previously (starts with "OT:")
      let targetPage = pages.find(p => p.isEditable && p.name && p.name.startsWith('OT:'));
      
      // 2. If not found, try to find any editable page to reuse
      if (!targetPage) {
        targetPage = pages.find(p => p.isEditable);
      }
      
      const payload = {
        name: `OT: ${runes.name}`,
        primaryStyleId: runes.primaryStyleId,
        subStyleId: runes.subStyleId,
        selectedPerkIds: runes.selectedPerkIds,
        current: true // automatically set active
      };

      if (targetPage) {
        console.log(`[LCU] Updating existing editable rune page in the same slot: ID ${targetPage.id} ("${targetPage.name}")`);
        await this.request('PUT', `/lol-perks/v1/pages/${targetPage.id}`, payload);
        console.log(`Applied runes in the same slot (ID ${targetPage.id}) for ${runes.name} successfully.`);
      } else {
        console.log(`[LCU] No editable rune page found. Creating a new one.`);
        const newPage = await this.request('POST', '/lol-perks/v1/pages', payload);
        if (newPage && newPage.id) {
          console.log(`[LCU] Rune page created successfully with ID: ${newPage.id}`);
          try {
            await this.request('PUT', '/lol-perks/v1/activepage', newPage.id);
          } catch (e) {
            // ignore active page errors
          }
        }
        console.log(`Applied runes for ${runes.name} successfully.`);
      }
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
      console.log(`[LCU] Items data received:`, JSON.stringify({
        startingBuild: items.startingBuild ? items.startingBuild.length : 0,
        popularBoots: items.popularBoots ? items.popularBoots.length : 0,
        coreItems: items.coreItems ? items.coreItems.length : 0,
        recommendedItems: items.recommendedItems ? items.recommendedItems.length : 0
      }));

      // 1. Get current summoner
      const summoner = await this.request('GET', '/lol-summoner/v1/current-summoner');
      if (!summoner || !summoner.summonerId) {
        throw new Error('Summoner ID not found');
      }
      console.log(`[LCU] Got summoner: ${summoner.displayName || summoner.gameName} (ID: ${summoner.summonerId})`);

      const summonerId = summoner.summonerId;

      // 2. Get current item sets
      let setsData;
      try {
        setsData = await this.request('GET', `/lol-item-sets/v1/item-sets/${summonerId}/sets`);
        console.log(`[LCU] Current item sets count: ${setsData && setsData.itemSets ? setsData.itemSets.length : 0}`);
      } catch (getErr) {
        console.warn('[LCU] Could not GET item sets, initializing empty:', getErr.message);
        setsData = null;
      }

      if (!setsData || typeof setsData !== 'object') {
        setsData = {
          accountId: summoner.accountId || 0,
          timestamp: Date.now(),
          itemSets: []
        };
      }
      // Ensure required fields exist on setsData
      if (!setsData.itemSets) setsData.itemSets = [];
      if (!setsData.accountId) setsData.accountId = summoner.accountId || 0;

      // 3. Construct blocks from scraped items
      const blocks = [];

      if (items.startingBuild && items.startingBuild.length > 0) {
        blocks.push({
          type: 'Item Inicial',
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
        blocks.push({
          type: 'Items Core',
          hideIfSummonerSpell: '',
          showIfSummonerSpell: '',
          items: items.coreItems.map(it => ({ id: String(it.id), count: 1 }))
        });
      }

      if (items.recommendedItems && items.recommendedItems.length > 0) {
        blocks.push({
          type: 'Items Recomendados',
          hideIfSummonerSpell: '',
          showIfSummonerSpell: '',
          items: items.recommendedItems.map(it => ({ id: String(it.id), count: 1 }))
        });
      }

      console.log(`[LCU] Built ${blocks.length} item blocks: ${blocks.map(b => b.type).join(', ')}`);

      if (blocks.length === 0) {
        console.log('[LCU] No items to apply for item set. Skipping.');
        return false;
      }

      // 4. Create new item set object (UNIFIED set)
      const title = 'OT: Build';
      const newSet = {
        title: title,
        type: 'custom',
        map: 'any',
        mode: 'any',
        priority: true,
        sortrank: 0,
        uid: 'ot-unified-set',
        associatedChampions: [championId],
        associatedMaps: [],
        blocks: blocks
      };

      // 5. Remove existing unified set or legacy sets to prevent duplication and keep 1 slot
      const beforeCount = setsData.itemSets.length;
      setsData.itemSets = setsData.itemSets.filter(set => {
        if (set.uid === 'ot-unified-set' || set.title === title) return false;
        if (set.uid === `ot-set-${championId}`) return false;
        if (set.associatedChampions && set.associatedChampions.includes(championId) && set.title && set.title.startsWith('OT:')) return false;
        return true;
      });
      console.log(`[LCU] Removed ${beforeCount - setsData.itemSets.length} existing set(s) to reuse the slot`);

      // 6. Add our new set
      setsData.itemSets.push(newSet);
      setsData.timestamp = Date.now();

      // 7. Push back to LCU
      console.log(`[LCU] Pushing item set to LCU (total sets: ${setsData.itemSets.length})...`);
      await this.request('PUT', `/lol-item-sets/v1/item-sets/${summonerId}/sets`, setsData);
      console.log(`[LCU] ✅ Successfully applied custom item set for ${championName}`);
      return true;
    } catch (err) {
      console.error('[LCU] ❌ Failed to apply item set:', err.message || err);
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
