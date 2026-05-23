const fs = require('fs');
const ValorantConnector = require('../valorant-connector.js');

console.log('[DIAGNOSTIC] Initializing Valorant Connector...');
const connector = new ValorantConnector({
  onStatusChange: async (status) => {
    console.log('[DIAGNOSTIC] Connection Status changed:', status);
    if (status === 'connected') {
      console.log('[DIAGNOSTIC] Connected successfully! Shard:', connector.shard, 'PUUID:', connector.puuid);
      
      console.log('[DIAGNOSTIC] Waiting 2 seconds for seasons static assets to load...');
      setTimeout(async () => {
        // Try to get parsed profile
        try {
          const profile = await connector.getLocalPlayerProfile();
          console.log('[DIAGNOSTIC] Parsed Local Profile:', JSON.stringify(profile, null, 2));
        } catch (err) {
          console.error('[DIAGNOSTIC] Error getting local player profile:', err);
        }

        // Fetch local chat presences to see if card ID is available
        try {
          console.log('[DIAGNOSTIC] Querying local presences...');
          const presences = await connector.localRequest('GET', '/chat/v4/presences');
          if (presences && presences.presences) {
            const selfPresence = presences.presences.find(p => p.puuid === connector.puuid);
            if (selfPresence && selfPresence.private) {
              const decoded = Buffer.from(selfPresence.private, 'base64').toString('utf8');
              console.log('[DIAGNOSTIC] Decoded Self Presence JSON:', decoded);
            } else {
              console.log('[DIAGNOSTIC] Self presence private block missing.');
            }
          } else {
            console.log('[DIAGNOSTIC] Presences response empty.');
          }
        } catch (presErr) {
          console.error('[DIAGNOSTIC] Failed to fetch local presences:', presErr.message);
        }

        // Fetch raw MMR to inspect JSON structure
        try {
          console.log('[DIAGNOSTIC] Requesting raw MMR from remote Riot endpoint...');
          const rawMmr = await connector.remoteRequest(
            'GET',
            `pd.${connector.shard}.a.pvp.net`,
            `/mmr/v1/players/${connector.puuid}`
          );
          console.log('[DIAGNOSTIC] Raw MMR Response:');
          fs.writeFileSync('scratch/mmr.json', JSON.stringify(rawMmr, null, 2));
          console.log('[DIAGNOSTIC] Saved MMR payload successfully to scratch/mmr.json!');
        } catch (err) {
          console.error('[DIAGNOSTIC] Error fetching raw MMR:', err);
        }

        connector.stop();
        process.exit(0);
      }, 2000);
    }
  }
});

connector.start();
setTimeout(() => {
  console.log('[DIAGNOSTIC] Timeout waiting for connection (10s). Make sure Valorant is running.');
  connector.stop();
  process.exit(1);
}, 10000);
