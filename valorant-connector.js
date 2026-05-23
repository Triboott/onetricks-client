const fs = require('fs');
const path = require('path');
const https = require('https');

class ValorantConnector {
  constructor({ onStatusChange, onGameStarted, onGameEnded }) {
    this.onStatusChange = onStatusChange || (() => {});
    this.onGameStarted = onGameStarted || (() => {});
    this.onGameEnded = onGameEnded || (() => {});

    this.port = null;
    this.password = null;
    this.status = 'disconnected'; // 'disconnected', 'scanning', 'connected'
    
    this.puuid = null;
    this.shard = null;
    this.region = null;
    this.clientVersion = null;
    this.accessToken = null;
    this.entitlementsToken = null;
    
    this.activeActUuid = null;
    this.seasonsList = [];
    this.agentsDict = {};
    this.competitivetiersDict = {};

    this.scanInterval = null;
    this.pollInterval = null;
    
    this.isInGame = false;
    this.currentMatchId = null;
    this.lockfilePath = null;

    // Cache to prevent duplicate scanning/queries
    this.lastKnownPath = null;
    this.namesCache = {}; // PUUID -> { gameName, tagLine, displayName }
    this.mmrCache = {};   // PUUID -> { rank, rr }
  }

  start() {
    this.loadStaticAssets();
    this.restartScan();
  }

  stop() {
    this.stopScan();
    this.stopPolling();
  }

  restartScan() {
    this.stopScan();
    this.scanInterval = setInterval(() => this.scan(), 3000);
    this.scan(); // immediate run
  }

  stopScan() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  startPolling() {
    this.stopPolling();
    this.pollInterval = setInterval(() => this.pollMatchState(), 5000);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async loadStaticAssets() {
    try {
      // Fetch latest client version dynamically from public Valorant-API
      https.get('https://valorant-api.com/v1/version', (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawData);
            if (parsed && parsed.data && parsed.data.riotClientVersion) {
              this.clientVersion = parsed.data.riotClientVersion;
              console.log(`[VALORANT] Loaded client version dynamically from valorant-api.com: ${this.clientVersion}`);
            }
          } catch (e) {
            console.error('[VALORANT] Failed to parse version JSON:', e);
          }
        });
      }).on('error', (err) => {
        console.error('[VALORANT] Failed to fetch version dynamically:', err.message);
      });

      // 1. Fetch Agents from public Valorant-API
      https.get('https://valorant-api.com/v1/agents?language=es-ES&isPlayableCharacter=true', (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawData);
            if (parsed && parsed.data) {
              parsed.data.forEach(agent => {
                this.agentsDict[agent.uuid.toLowerCase()] = {
                  name: agent.displayName,
                  icon: agent.displayIcon
                };
              });
              console.log(`[VALORANT] Loaded ${parsed.data.length} agents dynamically from valorant-api.com`);
            }
          } catch (e) {
            console.error('[VALORANT] Failed to parse agents JSON:', e);
          }
        });
      }).on('error', (err) => {
        console.error('[VALORANT] Failed to fetch agents dynamically:', err.message);
      });

      // 2. Fetch seasons to identify the active competitive Act
      https.get('https://valorant-api.com/v1/seasons', (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawData);
            if (parsed && parsed.data) {
              this.seasonsList = parsed.data.filter(s => s.type === 'EAresSeasonType::Act' || s.type === 'Act');
              
              const now = new Date();
              const activeAct = this.seasonsList.find(s => {
                const start = new Date(s.startTime);
                const end = new Date(s.endTime);
                return now >= start && now <= end;
              });

              if (activeAct) {
                this.activeActUuid = activeAct.uuid;
                console.log(`[VALORANT] Identified active Act: ${activeAct.displayName} (UUID: ${this.activeActUuid})`);
              } else {
                // Fallback to latest Act by startTime
                const acts = [...this.seasonsList].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
                if (acts.length > 0) {
                  this.activeActUuid = acts[0].uuid;
                  console.log(`[VALORANT] No current active Act found by dates. Using latest Act: ${acts[0].displayName} (UUID: ${this.activeActUuid})`);
                }
              }
            }
          } catch (e) {
            console.error('[VALORANT] Failed to parse seasons JSON:', e);
          }
        });
      }).on('error', (err) => {
        console.error('[VALORANT] Failed to fetch seasons dynamically:', err.message);
      });

      // 3. Fetch competitive tiers from public Valorant-API (Spanish)
      https.get('https://valorant-api.com/v1/competitivetiers?language=es-ES', (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawData);
            if (parsed && parsed.data && parsed.data.length > 0) {
              const latestGroup = parsed.data[parsed.data.length - 1];
              if (latestGroup && latestGroup.tiers) {
                latestGroup.tiers.forEach(tier => {
                  this.competitivetiersDict[tier.tier] = {
                    name: tier.tierName,
                    icon: tier.largeIcon || tier.smallIcon || ''
                  };
                });
                console.log(`[VALORANT] Loaded ${latestGroup.tiers.length} competitive ranks dynamically from valorant-api.com`);
              }
            }
          } catch (e) {
            console.error('[VALORANT] Failed to parse competitive tiers JSON:', e);
          }
        });
      }).on('error', (err) => {
        console.error('[VALORANT] Failed to fetch competitive tiers dynamically:', err.message);
      });
    } catch (err) {
      console.error('[VALORANT] Load static assets failed:', err);
    }
  }

  async scan() {
    if (this.status === 'connected') return;

    this.updateStatus('scanning');

    let possiblePaths = [];

    // Cache reconnection first
    if (this.lastKnownPath) {
      possiblePaths.push(this.lastKnownPath);
    }

    // Default lockfile location for Riot Client
    const localAppData = process.env.LOCALAPPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : null);
    if (localAppData) {
      possiblePaths.push(path.join(localAppData, 'Riot Games', 'Riot Client', 'Config', 'lockfile'));
    }

    for (const p of possiblePaths) {
      if (p && fs.existsSync(p) && fs.lstatSync(p).isFile()) {
        try {
          const contents = fs.readFileSync(p, 'utf8');
          const parts = contents.split(':');
          if (parts.length >= 5) {
            const scanPort = parts[2];
            const scanPassword = parts[3];
            this.lockfilePath = p;

            // Test if Riot Client is responsive AND Valorant is running
            const valorantRunning = await this.checkValorantRunning(scanPort, scanPassword);
            if (valorantRunning) {
              this.port = scanPort;
              this.password = scanPassword;
              this.lastKnownPath = p;

              // Assert authentication tokens and local user profile
              const authOk = await this.fetchTokensAndUserInfo();
              if (authOk) {
                this.stopScan();
                this.updateStatus('connected');
                this.startPolling();
                return;
              }
            }
          }
        } catch (e) {
          // ignore read/connect errors during scan
        }
      }
    }
  }

  updateStatus(newStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.onStatusChange(newStatus);
    }
  }

  // HTTP Request Helper for Local Riot Client
  localRequest(method, endpoint, body = null, localPort = this.port, localPassword = this.password) {
    return new Promise((resolve, reject) => {
      if (!localPort || !localPassword) {
        return reject(new Error('Local Riot Client not connected'));
      }

      const options = {
        hostname: '127.0.0.1',
        port: localPort,
        path: endpoint,
        method: method,
        rejectUnauthorized: false, // self-signed certificate bypass
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`riot:${localPassword}`).toString('base64'),
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
            reject(new Error(`Local RCS request failed: status ${res.statusCode}`));
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

  // Check if Valorant product session is active in Riot Client
  async checkValorantRunning(testPort, testPassword) {
    try {
      const sessions = await this.localRequest('GET', '/product-session/v1/external-sessions', null, testPort, testPassword);
      if (sessions && typeof sessions === 'object') {
        const isRunning = Object.values(sessions).some(sess => sess.productId === 'valorant');
        return isRunning;
      }
    } catch (e) {
      // client not alive
    }
    return false;
  }

  // Fetch OAuth access token, entitlements token, region, PUUID, and client version
  async fetchTokensAndUserInfo() {
    try {
      // 1. Fetch Entitlements & Access Tokens
      const tokens = await this.localRequest('GET', '/entitlements/v1/token');
      if (!tokens || !tokens.accessToken || !tokens.token) {
        throw new Error('Missing tokens in local response');
      }
      this.accessToken = tokens.accessToken;
      this.entitlementsToken = tokens.token;
      this.puuid = tokens.subject;

      // 2. Fetch Region and Shard
      const regionData = await this.localRequest('GET', '/riotclient/region-locale');
      this.region = regionData.region ? regionData.region.toLowerCase() : 'eu';
      this.shard = this.region; // default match

      // 3. Fetch client version from external product sessions
      const sessions = await this.localRequest('GET', '/product-session/v1/external-sessions');
      if (sessions && typeof sessions === 'object') {
        for (const key of Object.keys(sessions)) {
          const sess = sessions[key];
          if (sess.productId === 'valorant') {
            if (sess.version && sess.version.startsWith('release-')) {
              this.clientVersion = sess.version;
            } else {
              console.log(`[VALORANT] Local product session version "${sess.version}" is not in release format. Retaining dynamically fetched clientVersion: ${this.clientVersion}`);
            }
            const args = sess.launchConfiguration && sess.launchConfiguration.arguments;
            if (args) {
              for (const arg of args) {
                if (arg.startsWith('-ares-deployment=')) {
                  this.shard = arg.split('=')[1].toLowerCase();
                }
              }
            }
          }
        }
      }

      // 4. Normalize Region for Valorant endpoint URLs (translate League regions)
      const valRegions = ['eu', 'na', 'ap', 'kr', 'latam', 'br'];
      if (!valRegions.includes(this.region)) {
        if (this.region === 'euw' || this.region === 'eune') {
          this.region = 'eu';
        } else if (this.region === 'lan' || this.region === 'las') {
          this.region = 'latam';
        } else {
          // Fallback to match the resolved shard
          this.region = this.shard;
        }
      }

      console.log(`[VALORANT] Authenticated successfully! Region: ${this.region}, Shard: ${this.shard}, PUUID: ${this.puuid}, Version: ${this.clientVersion}`);
      return true;
    } catch (err) {
      console.error('[VALORANT] Authentication failed:', err.message);
      return false;
    }
  }

  // HTTP Request Helper for Remote Riot Servers (PD and GLZ APIs)
  remoteRequest(method, hostname, endpoint, body = null) {
    return new Promise((resolve, reject) => {
      if (!this.accessToken || !this.entitlementsToken) {
        return reject(new Error('Missing remote authentication credentials'));
      }

      const options = {
        hostname: hostname,
        port: 443,
        path: endpoint,
        method: method,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'X-Riot-Entitlements-JWT': this.entitlementsToken,
          'X-Riot-ClientVersion': this.clientVersion || 'release-08.10-shipping-9-2457812',
          'X-Riot-ClientPlatform': 'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9',
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
            reject(new Error(`Remote request failed: status ${res.statusCode}`));
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

  // Periodic polling of the active match state (both core-game and pre-game agent pick phase)
  async pollMatchState() {
    if (this.status !== 'connected' || !this.puuid) return;

    try {
      // 1. Double check if Valorant process is still active (avoid polling remote server if player closed game)
      const stillRunning = await this.checkValorantRunning(this.port, this.password);
      if (!stillRunning) {
        console.log('[VALORANT] Valorant is no longer running. Disconnecting...');
        this.handleDisconnect();
        return;
      }

      // 2. Fetch Player Active Core-Game Session
      let playerSession = null;
      let isCoreGame = true;
      try {
        playerSession = await this.remoteRequest(
          'GET', 
          `glz-${this.region}-1.${this.shard}.a.pvp.net`, 
          `/core-game/v1/players/${this.puuid}`
        );
      } catch (err) {
        // If not in core-game, check if player is in pre-game agent pick phase
        isCoreGame = false;
        try {
          playerSession = await this.remoteRequest(
            'GET',
            `glz-${this.region}-1.${this.shard}.a.pvp.net`,
            `/pregame/v1/players/${this.puuid}`
          );
        } catch (pregameErr) {
          // Player is in neither core-game nor pre-game sessions
          if (this.isInGame) {
            console.log('[VALORANT] Player left active game/pregame session. Clearing caches...');
            this.isInGame = false;
            this.currentMatchId = null;
            this.matchType = null;
            this.namesCache = {}; // clear names cache
            this.mmrCache = {};   // clear MMR cache
            this.onGameEnded();
          }
          return;
        }
      }

      if (playerSession && playerSession.MatchID) {
        const matchId = playerSession.MatchID;
        const currentType = isCoreGame ? 'core-game' : 'pre-game';
        
        // Print status change logs
        if (!this.isInGame || this.currentMatchId !== matchId || this.matchType !== currentType) {
          console.log(`[VALORANT] 🎮 Detected active ${currentType} session! MatchID: ${matchId}`);
          this.isInGame = true;
          this.currentMatchId = matchId;
          this.matchType = currentType;
        }
        
        // Always compile and broadcast on every poll interval to keep the UI in sync in real-time!
        if (isCoreGame) {
          await this.compileAndBroadcastActiveGame(matchId);
        } else {
          await this.compileAndBroadcastPregame(matchId);
        }
      }
    } catch (err) {
      console.error('[VALORANT] Error polling match state:', err.message);
    }
  }

  // Compiles agent select pick lobby details (pre-game)
  async compileAndBroadcastPregame(matchId) {
    try {
      console.log(`[VALORANT] Fetching pregame match details for MatchID: ${matchId}`);
      // 1. Fetch pregame match details
      const matchData = await this.remoteRequest(
        'GET',
        `glz-${this.region}-1.${this.shard}.a.pvp.net`,
        `/pregame/v1/matches/${matchId}`
      );

      if (!matchData) {
        console.warn('[VALORANT] Pregame match data is empty or invalid.');
        return;
      }

      let allyPlayers = [];
      let enemyPlayers = [];

      // Robust check: In custom games, AllyTeam might be undefined. We fall back to scanning matchData.Teams
      if (matchData.AllyTeam && matchData.AllyTeam.Players) {
        console.log('[VALORANT] Detected AllyTeam in pregame match data.');
        allyPlayers = matchData.AllyTeam.Players;
        enemyPlayers = matchData.EnemyTeam && matchData.EnemyTeam.Players ? matchData.EnemyTeam.Players : [];
      } else if (matchData.Teams && Array.isArray(matchData.Teams)) {
        console.log('[VALORANT] AllyTeam missing. Scanning Teams array (likely a Custom game)...');
        // Find which team contains the local player (using this.puuid)
        const myTeam = matchData.Teams.find(t => t.Players && t.Players.some(p => p.Subject === this.puuid));
        if (myTeam) {
          console.log(`[VALORANT] Found local player in Team: ${myTeam.TeamID}`);
          allyPlayers = myTeam.Players || [];
          // All other teams are enemy teams
          matchData.Teams.forEach(t => {
            if (t.TeamID !== myTeam.TeamID) {
              enemyPlayers.push(...(t.Players || []));
            }
          });
        } else {
          // Fallback if we cannot find ourselves: use the first team as allies
          console.log('[VALORANT] Local player PUUID not found in any team. Using default team split.');
          if (matchData.Teams.length > 0) {
            allyPlayers = matchData.Teams[0].Players || [];
            for (let i = 1; i < matchData.Teams.length; i++) {
              enemyPlayers.push(...(matchData.Teams[i].Players || []));
            }
          }
        }
      } else {
        console.warn('[VALORANT] Pregame match data teams roster missing entirely.');
        return;
      }

      console.log(`[VALORANT] Pregame team sizes resolved -> Allies: ${allyPlayers.length}, Enemies: ${enemyPlayers.length}`);

      const allPlayers = [...allyPlayers, ...enemyPlayers];
      // Filter out players with blank subjects (enemies are hidden/blank in pick phase)
      const validPlayers = allPlayers.filter(p => p.Subject);
      const puuids = validPlayers.map(p => p.Subject);

      // 2. Resolve Player Names and Taglines in bulk (utilize cache)
      const missingPuuids = puuids.filter(p => !this.namesCache[p]);
      if (missingPuuids.length > 0) {
        try {
          const nameResolution = await this.remoteRequest(
            'PUT',
            `pd.${this.shard}.a.pvp.net`,
            '/name-service/v2/players',
            missingPuuids
          );
          if (nameResolution && Array.isArray(nameResolution)) {
            nameResolution.forEach(record => {
              this.namesCache[record.Subject] = {
                gameName: record.GameName,
                tagLine: record.TagLine,
                displayName: `${record.GameName}#${record.TagLine}`
              };
            });
          }
        } catch (err) {
          console.warn('[VALORANT] Failed to resolve pregame names in bulk:', err.message);
        }
      }

      const blueTeam = []; // Allies (Allied Team)
      const redTeam = [];  // Enemies (Enemy Team)

      const compileList = async (rawPlayers, targetList) => {
        for (const p of rawPlayers) {
          try {
            const puuid = p.Subject;
            
            // Fallback for hidden opponents in picking phase
            let identity = { gameName: 'Enemigo', tagLine: 'VAL', displayName: 'Enemigo#VAL' };
            if (puuid) {
              identity = this.namesCache[puuid] || { gameName: 'Aliado', tagLine: 'VAL', displayName: 'Aliado#VAL' };
            }

            // Resolve Agent Details (hovered or locked CharacterID)
            const agentUuid = (p.CharacterID || '').toLowerCase();
            const resolvedAgent = this.agentsDict[agentUuid] || { 
              name: p.CharacterID ? 'Agente Seleccionado' : 'Eligiendo Agente...', 
              icon: '' 
            };

            // Get Account Level
            const level = p.PlayerIdentity ? p.PlayerIdentity.AccountLevel : 1;

            // Fetch Rank, MMR & stats Details (utilize caching)
            let rank = 0;
            let rr = 0;
            let wins = 0;
            let games = 0;
            let winrate = 0;
            let adr = 0;
            let headshotPct = 0;

            if (puuid) {
              const fallbackRank = p.CompetitiveTier || 0;
              const stats = await this.fetchPlayerMmrAndStats(puuid, fallbackRank);
              rank = stats.rank;
              rr = stats.rr;
              wins = stats.wins;
              games = stats.games;
              winrate = stats.winrate;
              adr = stats.adr;
              headshotPct = stats.headshotPct;
            } else {
              rank = p.CompetitiveTier || 0;
            }

            const resolvedRank = this.competitivetiersDict[rank] || { name: 'Sin Clasificar', icon: '' };

            targetList.push({
              puuid: puuid || '',
              displayName: identity.displayName,
              gameName: identity.gameName,
              tagLine: identity.tagLine,
              summonerLevel: level,
              championDisplayName: resolvedAgent.name,
              championImage: resolvedAgent.icon,
              tier: rank,
              tierName: resolvedRank.name,
              tierIcon: resolvedRank.icon,
              lp: rr,
              wins: wins,
              losses: games - wins,
              games: games,
              winrate: winrate,
              adr: adr,
              headshotPct: headshotPct
            });
          } catch (playerErr) {
            console.error('[VALORANT] Error assembling pregame player profile card:', playerErr);
          }
        }
      };

      // Compile Allies
      await compileList(allyPlayers, blueTeam);
      // Compile Enemies
      await compileList(enemyPlayers, redTeam);

      // Smart balancing for Free-For-All/Deathmatch modes:
      // If one column is completely empty and the other contains multiple players,
      // split them evenly between the two columns to keep the UI clean and premium.
      if (blueTeam.length > 0 && redTeam.length === 0) {
        const myIndex = blueTeam.findIndex(p => p.puuid === this.puuid);
        const me = myIndex !== -1 ? blueTeam.splice(myIndex, 1)[0] : null;
        
        const half = Math.floor(blueTeam.length / 2);
        const toMove = blueTeam.splice(half);
        redTeam.push(...toMove);
        
        if (me) {
          blueTeam.unshift(me);
        }
      } else if (redTeam.length > 0 && blueTeam.length === 0) {
        const myIndex = redTeam.findIndex(p => p.puuid === this.puuid);
        const me = myIndex !== -1 ? redTeam.splice(myIndex, 1)[0] : null;
        
        const half = Math.floor(redTeam.length / 2);
        const toMove = redTeam.splice(half);
        blueTeam.push(...toMove);
        
        if (me) {
          blueTeam.unshift(me);
        }
      }

      const activeGame = {
        gameId: matchId,
        isValorant: true,
        isPregame: true, // indicates pick phase
        blueTeam,
        redTeam
      };

      console.log(`[VALORANT] Compiled pregame pick roster successfully! Allies: ${blueTeam.length}, Enemies: ${redTeam.length}`);
      this.onGameStarted(activeGame);
    } catch (err) {
      console.error('[VALORANT] Failed to compile pregame pick roster:', err);
    }
  }

  // Compiles all names, levels, agents and competitive ranks for players in the active match
  async compileAndBroadcastActiveGame(matchId) {
    try {
      // 1. Fetch match details
      const matchData = await this.remoteRequest(
        'GET',
        `glz-${this.region}-1.${this.shard}.a.pvp.net`,
        `/core-game/v1/matches/${matchId}`
      );

      if (!matchData || !matchData.Players) {
        console.warn('[VALORANT] Match data player roster missing.');
        return;
      }

      const rawPlayers = matchData.Players;
      const puuids = rawPlayers.map(p => p.Subject);

      // 2. Resolve Player Names and Taglines in bulk (utilize cache)
      const missingPuuids = puuids.filter(p => !this.namesCache[p]);
      if (missingPuuids.length > 0) {
        try {
          const nameResolution = await this.remoteRequest(
            'PUT',
            `pd.${this.shard}.a.pvp.net`,
            '/name-service/v2/players',
            missingPuuids
          );
          if (nameResolution && Array.isArray(nameResolution)) {
            nameResolution.forEach(record => {
              this.namesCache[record.Subject] = {
                gameName: record.GameName,
                tagLine: record.TagLine,
                displayName: `${record.GameName}#${record.TagLine}`
              };
            });
          }
        } catch (err) {
          console.warn('[VALORANT] Failed to resolve names in bulk:', err.message);
        }
      }

      // Find local player's team to split Allies vs Enemies
      const localPlayerRecord = rawPlayers.find(p => p.Subject === this.puuid);
      const localTeamId = localPlayerRecord ? localPlayerRecord.TeamID : 'Blue';

      const blueTeam = []; // Allies (players on local player's team)
      const redTeam = [];  // Enemies (players on opposing team)

      for (const p of rawPlayers) {
        try {
          const puuid = p.Subject;
          const identity = this.namesCache[puuid] || { gameName: 'Jugador', tagLine: 'VAL', displayName: 'Jugador#VAL' };
          
          // Resolve Agent Details
          const agentUuid = (p.CharacterID || '').toLowerCase();
          const resolvedAgent = this.agentsDict[agentUuid] || { name: 'Agente Seleccionando', icon: '' };
          
          // Get Account Level
          const level = p.PlayerIdentity ? p.PlayerIdentity.AccountLevel : 1;

          // Fetch Rank, MMR & stats Details (utilize caching)
          let rank = 0;
          let rr = 0;
          let wins = 0;
          let games = 0;
          let winrate = 0;
          let adr = 0;
          let headshotPct = 0;

          if (puuid) {
            const fallbackRank = p.SeasonalBadgeInfo ? p.SeasonalBadgeInfo.Rank : 0;
            const stats = await this.fetchPlayerMmrAndStats(puuid, fallbackRank);
            rank = stats.rank;
            rr = stats.rr;
            wins = stats.wins;
            games = stats.games;
            winrate = stats.winrate;
            adr = stats.adr;
            headshotPct = stats.headshotPct;
          } else {
            rank = p.SeasonalBadgeInfo ? p.SeasonalBadgeInfo.Rank : 0;
          }

          const resolvedRank = this.competitivetiersDict[rank] || { name: 'Sin Clasificar', icon: '' };

          const compiledPlayer = {
            puuid: puuid,
            displayName: identity.displayName,
            gameName: identity.gameName,
            tagLine: identity.tagLine,
            summonerLevel: level, // keep named level as summonerLevel for template compatibility
            championDisplayName: resolvedAgent.name, // keep champion name for compatibility
            championImage: resolvedAgent.icon, // direct URL of agent icon
            tier: rank, // competitive rank tier number
            tierName: resolvedRank.name,
            tierIcon: resolvedRank.icon,
            lp: rr, // Competitive Rating (RR)
            wins: wins,
            losses: games - wins,
            games: games,
            winrate: winrate,
            adr: adr,
            headshotPct: headshotPct
          };

          // Split into left (allies) / right (enemies) columns dynamically
          if (p.TeamID === localTeamId) {
            blueTeam.push(compiledPlayer);
          } else {
            redTeam.push(compiledPlayer);
          }
        } catch (playerErr) {
          console.error('[VALORANT] Error assembling player profile card:', playerErr);
        }
      }

      // Smart balancing for Free-For-All/Deathmatch modes:
      // If one column is completely empty and the other contains multiple players,
      // split them evenly between the two columns to keep the UI clean and premium.
      if (blueTeam.length > 0 && redTeam.length === 0) {
        const myIndex = blueTeam.findIndex(p => p.puuid === this.puuid);
        const me = myIndex !== -1 ? blueTeam.splice(myIndex, 1)[0] : null;
        
        const half = Math.floor(blueTeam.length / 2);
        const toMove = blueTeam.splice(half);
        redTeam.push(...toMove);
        
        if (me) {
          blueTeam.unshift(me);
        }
      } else if (redTeam.length > 0 && blueTeam.length === 0) {
        const myIndex = redTeam.findIndex(p => p.puuid === this.puuid);
        const me = myIndex !== -1 ? redTeam.splice(myIndex, 1)[0] : null;
        
        const half = Math.floor(redTeam.length / 2);
        const toMove = redTeam.splice(half);
        blueTeam.push(...toMove);
        
        if (me) {
          blueTeam.unshift(me);
        }
      }

      const activeGame = {
        gameId: matchId,
        isValorant: true,
        blueTeam,
        redTeam
      };

      console.log(`[VALORANT] Compiled in-game roster successfully! Allies: ${blueTeam.length}, Enemies: ${redTeam.length}`);
      this.onGameStarted(activeGame);
    } catch (err) {
      console.error('[VALORANT] Failed to compile match details roster:', err);
    }
  }

  // Unified, rate-limit friendly helper to fetch rank, MMR and recent competitive statistics for any player
  async fetchPlayerMmrAndStats(puuid, fallbackRank = 0) {
    if (!puuid) return { rank: fallbackRank, rr: 0, wins: 0, games: 0, winrate: 0, adr: 0, headshotPct: 0 };
    
    const nowTime = Date.now();
    const cached = this.mmrCache[puuid];
    
    // Return cached details if fully populated and fresh (no failed flags)
    if (cached && cached.adr !== undefined && !cached.failed && (nowTime - cached.timestamp < 1800000)) {
      return cached;
    }

    let rank = fallbackRank;
    let rr = 0;
    let wins = 0;
    let games = 0;
    let winrate = 0;
    let adr = 0;
    let hsPct = 0;
    let failed = false;

    // 1. Fetch Competitive MMR Details
    try {
      const mmr = await this.remoteRequest(
        'GET',
        `pd.${this.shard}.a.pvp.net`,
        `/mmr/v1/players/${puuid}`
      );
      
      const competitive = mmr && mmr.QueueSkills && mmr.QueueSkills.competitive;
      if (competitive && competitive.SeasonalInfoBySeasonID) {
        let seasonal = null;
        if (this.activeActUuid) {
          const activeKey = Object.keys(competitive.SeasonalInfoBySeasonID).find(
            key => key.toLowerCase() === this.activeActUuid.toLowerCase()
          );
          if (activeKey) {
            seasonal = competitive.SeasonalInfoBySeasonID[activeKey];
          }
        }
        
        // Chronological Act Fallback
        if (!seasonal || !(seasonal.CompetitiveTier || seasonal.Rank)) {
          const playedSeasonKeys = Object.keys(competitive.SeasonalInfoBySeasonID).filter(key => {
            const record = competitive.SeasonalInfoBySeasonID[key];
            return record && (record.CompetitiveTier > 0 || record.Rank > 0);
          });

          if (playedSeasonKeys.length > 0) {
            playedSeasonKeys.sort((a, b) => {
              const seasonA = this.seasonsList.find(s => s.uuid.toLowerCase() === a.toLowerCase());
              const seasonB = this.seasonsList.find(s => s.uuid.toLowerCase() === b.toLowerCase());
              const startA = seasonA ? new Date(seasonA.startTime) : new Date(0);
              const startB = seasonB ? new Date(seasonB.startTime) : new Date(0);
              return startB - startA;
            });

            const bestKey = playedSeasonKeys[0];
            seasonal = competitive.SeasonalInfoBySeasonID[bestKey];
          }
        }

        if (seasonal) {
          rank = seasonal.CompetitiveTier || seasonal.Rank || 0;
          rr = seasonal.RankedRating || seasonal.CompetitiveRating || 0;
          wins = seasonal.NumberOfWins || 0;
          games = seasonal.NumberOfGames || 0;
        }
      }
      
      winrate = games > 0 ? Math.round((wins / games) * 100) : 0;
    } catch (mmrErr) {
      console.warn(`[VALORANT] Failed to fetch MMR for player ${puuid}:`, mmrErr.message);
      failed = true;
    }

    // 2. Fetch Match History and stats (ADR, HS%)
    if (!failed) {
      try {
        const history = await this.remoteRequest(
          'GET',
          `pd.${this.shard}.a.pvp.net`,
          `/match-history/v1/history/${puuid}?queue=competitive&endIndex=3`
        );
        if (history && history.History && history.History.length > 0) {
          const targetMatches = history.History.slice(0, 3);
          const detailsPromises = targetMatches.map(m =>
            this.remoteRequest(
              'GET',
              `pd.${this.shard}.a.pvp.net`,
              `/match-details/v1/matches/${m.MatchID}`
            ).catch(() => null)
          );
          const matchesDetails = await Promise.all(detailsPromises);

          let totalDamage = 0;
          let totalRoundsPlayed = 0;
          let totalHS = 0, totalBS = 0, totalLS = 0;

          matchesDetails.forEach(details => {
            if (!details) return;
            const player = details.players.find(p => p.subject === puuid);
            if (!player) return;

            const roundsPlayed = player.stats ? player.stats.roundsPlayed : 0;
            totalRoundsPlayed += roundsPlayed;

            if (player.roundDamage) {
              totalDamage += player.roundDamage.reduce((sum, rd) => sum + (rd.damage || 0), 0);
            }

            if (details.roundResults) {
              details.roundResults.forEach(round => {
                const playerStat = round.playerStats.find(ps => ps.subject === puuid);
                if (playerStat && playerStat.damage) {
                  playerStat.damage.forEach(dmg => {
                    totalHS += dmg.headshots || 0;
                    totalBS += dmg.bodyshots || 0;
                    totalLS += dmg.legshots || 0;
                  });
                }
              });
            }
          });

          adr = totalRoundsPlayed > 0 ? Math.round(totalDamage / totalRoundsPlayed) : 0;
          const totalHits = totalHS + totalBS + totalLS;
          hsPct = totalHits > 0 ? Math.round((totalHS / totalHits) * 100) : 0;
        }
      } catch (statErr) {
        console.warn(`[VALORANT] Failed to calculate ADR/HS% stats for player ${puuid}:`, statErr.message);
      }
    }

    const result = {
      rank,
      rr,
      wins,
      games,
      winrate,
      adr,
      headshotPct: hsPct,
      failed,
      timestamp: nowTime
    };

    // Cache the fully resolved statistics
    this.mmrCache[puuid] = result;
    return result;
  }

  async getLocalPlayerProfile() {
    if (this.status !== 'connected' || !this.puuid) return null;

    try {
      const puuid = this.puuid;
      
      // Resolve name
      if (!this.namesCache[puuid]) {
        try {
          const nameResolution = await this.remoteRequest(
            'PUT',
            `pd.${this.shard}.a.pvp.net`,
            '/name-service/v2/players',
            [puuid]
          );
          if (nameResolution && Array.isArray(nameResolution) && nameResolution.length > 0) {
            const record = nameResolution[0];
            this.namesCache[puuid] = {
              gameName: record.GameName,
              tagLine: record.TagLine,
              displayName: `${record.GameName}#${record.TagLine}`
            };
          }
        } catch (e) {
          console.warn('[VALORANT] Failed to fetch local player name:', e.message);
        }
      }

      const identity = this.namesCache[puuid] || { gameName: 'Agente', tagLine: 'VAL', displayName: 'Agente#VAL' };

      // Resolve Player Card ID from Local Chat Presences first (highly reliable and local!)
      let playerCardId = '9fb348bc-41a0-91ad-8a3e-7880da3e70b4'; // default to standard default Player Card UUID
      try {
        const presences = await this.localRequest('GET', '/chat/v4/presences');
        if (presences && presences.presences) {
          const selfPresence = presences.presences.find(p => p.puuid === puuid);
          if (selfPresence && selfPresence.private) {
            const decoded = JSON.parse(Buffer.from(selfPresence.private, 'base64').toString('utf8'));
            if (decoded && decoded.playerPresenceData && decoded.playerPresenceData.playerCardId) {
              playerCardId = decoded.playerPresenceData.playerCardId;
            }
          }
        }
      } catch (presErr) {
        console.warn('[VALORANT] Failed to fetch player card ID from local presences:', presErr.message);
      }

      // If we still have the default card, try player-loadout as a remote fallback
      if (playerCardId === '9fb348bc-41a0-91ad-8a3e-7880da3e70b4') {
        try {
          const loadout = await this.remoteRequest(
            'GET',
            `pd.${this.shard}.a.pvp.net`,
            `/player-loadout/v1/players/${puuid}`
          );
          if (loadout && loadout.Identity && loadout.Identity.PlayerCardID) {
            playerCardId = loadout.Identity.PlayerCardID;
          }
        } catch (loadoutErr) {
          // silent fallback
        }
      }

      // Resolve rank, MMR and recent match stats using helper method
      const stats = await this.fetchPlayerMmrAndStats(puuid);
      const resolvedRank = this.competitivetiersDict[stats.rank] || { name: 'Sin Clasificar', icon: '' };

      return {
        puuid: puuid,
        displayName: identity.displayName,
        gameName: identity.gameName,
        tagLine: identity.tagLine,
        tier: stats.rank,
        tierName: resolvedRank.name,
        tierIcon: resolvedRank.icon,
        lp: stats.rr,
        playerCardId: playerCardId,
        winrate: stats.winrate || 0,
        wins: stats.wins || 0,
        games: stats.games || 0,
        adr: stats.adr || 0,
        headshotPct: stats.headshotPct || 0
      };
    } catch (err) {
      console.error('[VALORANT] Error fetching local player profile:', err.message);
      return null;
    }
  }

  handleDisconnect() {
    this.stopPolling();
    this.port = null;
    this.password = null;
    this.accessToken = null;
    this.entitlementsToken = null;
    this.puuid = null;
    this.namesCache = {}; // clear names cache
    this.mmrCache = {};   // clear MMR cache
    
    if (this.isInGame) {
      this.isInGame = false;
      this.currentMatchId = null;
      this.onGameEnded();
    }

    this.updateStatus('disconnected');
    this.restartScan();
  }
}

module.exports = ValorantConnector;
