const fs = require('fs');
const path = require('path');

const nextData = JSON.parse(fs.readFileSync(path.join(__dirname, 'next_data_debug.json'), 'utf8'));
const patchStats = nextData.props.pageProps.patchStats;

console.log('patchStats keys:', Object.keys(patchStats || {}));

if (patchStats.all) {
  console.log('patchStats.all keys:', Object.keys(patchStats.all));
  // Let's print details of one key inside all, e.g. "top" or "mid" or "all"
  for (const role of Object.keys(patchStats.all)) {
    console.log(`patchStats.all["${role}"] keys:`, Object.keys(patchStats.all[role]));
  }
}

if (patchStats['16.10']) {
  console.log('patchStats["16.10"] keys:', Object.keys(patchStats['16.10']));
  for (const role of Object.keys(patchStats['16.10'])) {
    console.log(`patchStats["16.10"]["${role}"] keys:`, Object.keys(patchStats['16.10'][role]));
    
    // Look at popSpells or popular summoners inside patchStats["16.10"][role]
    const roleStats = patchStats['16.10'][role];
    if (roleStats.popSpells) {
      console.log(`    popSpells for ${role}:`, roleStats.popSpells);
    }
  }
}
