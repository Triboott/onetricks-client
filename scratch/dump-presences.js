const fs = require('fs');
const path = require('path');
const ValorantConnector = require('../valorant-connector.js');

console.log('[DIAGNOSTIC] Damping presences...');
const connector = new ValorantConnector({
  onStatusChange: async (status) => {
    if (status === 'connected') {
      try {
        const presences = await connector.localRequest('GET', '/chat/v4/presences');
        fs.writeFileSync('scratch/presences.json', JSON.stringify(presences, null, 2));
        console.log('[DIAGNOSTIC] Wrote scratch/presences.json successfully!');
        
        // Let's decode every presence and dump it
        const decodedPresences = [];
        if (presences && presences.presences) {
          presences.presences.forEach((p, idx) => {
            let decoded = null;
            if (p.private) {
              try {
                decoded = Buffer.from(p.private, 'base64').toString('utf8');
                // Check if it looks like JSON
                if (decoded.trim().startsWith('{')) {
                  decoded = JSON.parse(decoded);
                }
              } catch (e) {
                decoded = `[ERROR DECODING] ${e.message}`;
              }
            }
            decodedPresences.push({
              puuid: p.puuid,
              name: p.gameName || p.name,
              product: p.product,
              decodedPrivate: decoded
            });
          });
        }
        fs.writeFileSync('scratch/decoded_presences.json', JSON.stringify(decodedPresences, null, 2));
        console.log('[DIAGNOSTIC] Wrote scratch/decoded_presences.json successfully!');
      } catch (err) {
        console.error('[DIAGNOSTIC] Error:', err);
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
}, 5000);
