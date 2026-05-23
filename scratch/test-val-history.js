const fs = require('fs');
const ValorantConnector = require('../valorant-connector.js');

console.log('[DIAGNOSTIC] Initializing Valorant Connector for History...');
const connector = new ValorantConnector({
  onStatusChange: async (status) => {
    if (status === 'connected') {
      console.log('[DIAGNOSTIC] Connected! Shard:', connector.shard, 'PUUID:', connector.puuid);
      
      // Delay to ensure dynamic client version is loaded
      connector.clientVersion = 'release-12.09-shipping-25-4697179';
      
      try {
        console.log('[DIAGNOSTIC] Querying match history...');
        const history = await connector.remoteRequest(
          'GET',
          `pd.${connector.shard}.a.pvp.net`,
          `/match-history/v1/history/${connector.puuid}?queue=competitive`
        );
        
        console.log('[DIAGNOSTIC] Match History Success! Total matches found:', history.History ? history.History.length : 0);

        if (history.History && history.History.length > 0) {
          // Take the last 3 matches
          const targetMatches = history.History.slice(0, 3);
          console.log(`[DIAGNOSTIC] Querying details for the last ${targetMatches.length} matches in parallel...`);
          
          const detailsPromises = targetMatches.map(m => 
            connector.remoteRequest(
              'GET',
              `pd.${connector.shard}.a.pvp.net`,
              `/match-details/v1/matches/${m.MatchID}`
            ).catch(err => {
              console.warn(`[DIAGNOSTIC] Failed to fetch match ${m.MatchID}:`, err.message);
              return null;
            })
          );

          const matchesDetails = await Promise.all(detailsPromises);

          let totalDamage = 0;
          let totalRoundsPlayed = 0;
          let totalHeadshots = 0;
          let totalBodyshots = 0;
          let totalLegshots = 0;

          matchesDetails.forEach((details, idx) => {
            if (!details) return;
            const matchId = targetMatches[idx].MatchID;

            // Find player
            const player = details.players.find(p => p.subject === connector.puuid);
            if (!player) return;

            const roundsPlayed = player.stats ? player.stats.roundsPlayed : 0;
            totalRoundsPlayed += roundsPlayed;

            // Calculate total damage dealt in this match
            let matchDamage = 0;
            if (player.roundDamage) {
              matchDamage = player.roundDamage.reduce((sum, rd) => sum + (rd.damage || 0), 0);
            }
            totalDamage += matchDamage;

            // Calculate hits breakdown
            let matchHS = 0, matchBS = 0, matchLS = 0;
            if (details.roundResults) {
              details.roundResults.forEach(round => {
                const playerStat = round.playerStats.find(ps => ps.subject === connector.puuid);
                if (playerStat && playerStat.damage) {
                  playerStat.damage.forEach(dmg => {
                    matchHS += dmg.headshots || 0;
                    matchBS += dmg.bodyshots || 0;
                    matchLS += dmg.legshots || 0;
                  });
                }
              });
            }
            totalHeadshots += matchHS;
            totalBodyshots += matchBS;
            totalLegshots += matchLS;

            const matchHits = matchHS + matchBS + matchLS;
            const matchHSpct = matchHits > 0 ? Math.round((matchHS / matchHits) * 100) : 0;
            const matchADR = roundsPlayed > 0 ? Math.round(matchDamage / roundsPlayed) : 0;

            console.log(`- Match ${matchId.slice(0, 8)}... | Rounds: ${roundsPlayed} | Damage: ${matchDamage} | ADR: ${matchADR} | HS%: ${matchHSpct}%`);
          });

          // Calculate overall averages
          const avgADR = totalRoundsPlayed > 0 ? Math.round(totalDamage / totalRoundsPlayed) : 0;
          const totalHits = totalHeadshots + totalBodyshots + totalLegshots;
          const avgHS = totalHits > 0 ? Math.round((totalHeadshots / totalHits) * 100) : 0;

          console.log('\n======================================');
          console.log('AVERAGED RESULTS (LAST 3 MATCHES)');
          console.log('======================================');
          console.log(`- Average ADR: ${avgADR} Damage/Round`);
          console.log(`- Average Headshot %: ${avgHS}%`);
          console.log(`- Total Hits: HS: ${totalHeadshots}, BS: ${totalBodyshots}, LS: ${totalLegshots}`);
          console.log('======================================');
        } else {
          console.log('[DIAGNOSTIC] No matches found in competitive history.');
        }
      } catch (err) {
        console.error('[DIAGNOSTIC] Error querying history/details:', err);
      }

      connector.stop();
      process.exit(0);
    }
  }
});

connector.start();
setTimeout(() => {
  console.log('[DIAGNOSTIC] Timeout.');
  connector.stop();
  process.exit(1);
}, 12000);
