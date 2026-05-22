const fs = require('fs');
const path = require('path');

// Mock Electron so we can load the scraper without Electron runtime errors
const mockApp = {
  getPath: () => __dirname
};
require.cache[require.resolve('electron')] = {
  exports: {
    app: mockApp,
    BrowserWindow: class {}
  }
};

const LcuConnector = require('../lcu-connector.js');
const OnetricksScraper = require('../onetricks-scraper.js');
const scraper = new OnetricksScraper(null);

const connector = new LcuConnector({
  onStatusChange: (status) => {
    console.log('[TEST] Connection Status changed:', status);
    if (status === 'connected') {
      console.log('[TEST] Connected to Mock LCU! Port:', connector.port);
      setTimeout(runTest, 1000);
    }
  }
});

async function runTest() {
  try {
    console.log('[TEST] Fetching active game session...');
    const session = await connector.request('GET', '/lol-gameflow/v1/session');
    if (!session || !session.gameData) {
      console.log('[TEST] Game data missing in session. Make sure mock-lcu has started simulated game (option 0).');
      connector.stop();
      process.exit(1);
    }

    const { teamOne, teamTwo } = session.gameData;
    console.log(`[TEST] Found session. GameID: ${session.gameData.gameId}. Allied: ${teamOne.length}, Enemy: ${teamTwo.length}`);

    const fetchTeamPlayers = async (team) => {
      if (!team) return [];
      const players = [];
      for (const p of team) {
        try {
          const puuid = p.puuid;
          if (!puuid && !p.summonerId) continue;
          
          let gameName = p.summonerName || '';
          let tagLine = '';
          let profileIconId = null;
          let summonerLevel = 1;
          let fetchedSummoner = null;
          
          if (puuid) {
            try {
              fetchedSummoner = await connector.request('GET', `/lol-summoner/v2/summoners/puuid/${puuid}`);
            } catch (e) {
              console.warn(`[TEST] Failed to fetch summoner by PUUID ${puuid}:`, e.message);
            }
          }
          
          if (!fetchedSummoner && p.summonerId) {
            try {
              fetchedSummoner = await connector.request('GET', `/lol-summoner/v1/summoners/${p.summonerId}`);
            } catch (e) {
              console.warn(`[TEST] Failed to fetch summoner by ID ${p.summonerId}:`, e.message);
            }
          }
          
          if (fetchedSummoner) {
            gameName = fetchedSummoner.gameName || fetchedSummoner.displayName || p.summonerName || '';
            tagLine = fetchedSummoner.tagLine || '';
            profileIconId = fetchedSummoner.profileIconId || 1;
            summonerLevel = fetchedSummoner.summonerLevel || 1;
          }
          
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
              console.warn(`[TEST] Failed to fetch ranked stats for PUUID ${statsLookupPuuid}:`, e.message);
            }
          }

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
          console.error('[TEST] Error building player profile:', err);
        }
      }
      return players;
    };

    console.log('[TEST] Compiling teamOne (blue)...');
    const blueTeam = await fetchTeamPlayers(teamOne);
    console.log('[TEST] Compiling teamTwo (red)...');
    const redTeam = await fetchTeamPlayers(teamTwo);

    console.log('\n======================================');
    console.log('RESULTS OF FETCHED ACTIVE GAME PLAYERS');
    console.log('======================================');
    console.log('BLUE TEAM:');
    blueTeam.forEach(p => {
      console.log(`- ${p.displayName.padEnd(20)} | Champion: ${p.championDisplayName.padEnd(10)} | Rank: ${(p.tier + ' ' + p.division).padEnd(15)} | LP: ${p.lp.toString().padStart(4)} | Winrate: ${p.wins + p.losses > 0 ? p.winrate + '%' : '-%'} (${p.wins}W / ${p.losses}L)`);
    });

    console.log('\nRED TEAM:');
    redTeam.forEach(p => {
      console.log(`- ${p.displayName.padEnd(20)} | Champion: ${p.championDisplayName.padEnd(10)} | Rank: ${(p.tier + ' ' + p.division).padEnd(15)} | LP: ${p.lp.toString().padStart(4)} | Winrate: ${p.wins + p.losses > 0 ? p.winrate + '%' : '-%'} (${p.wins}W / ${p.losses}L)`);
    });

  } catch (err) {
    console.error('[TEST] Error during active game players compilation test:', err);
  } finally {
    connector.stop();
    process.exit(0);
  }
}

connector.start();
