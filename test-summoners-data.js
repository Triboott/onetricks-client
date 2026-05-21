const fs = require('fs');
const path = require('path');

const nextData = JSON.parse(fs.readFileSync(path.join(__dirname, 'next_data_debug.json'), 'utf8'));

function findSummoners(obj, path = '') {
  if (!obj || typeof obj !== 'object') return;
  
  if (obj.summonerSpells || obj.popSpells || obj.spell1Id || obj.spells) {
    console.log(`\nFound summoner spell keyword at: ${path}`);
    console.log('Keys:', Object.keys(obj));
    if (obj.summonerSpells) console.log('summonerSpells:', obj.summonerSpells);
    if (obj.popSpells) console.log('popSpells:', obj.popSpells);
    if (obj.spells) console.log('spells:', obj.spells);
  }
  
  for (const k of Object.keys(obj)) {
    findSummoners(obj[k], `${path}.${k}`);
  }
}

findSummoners(nextData.props);
