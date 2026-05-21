const fs = require('fs');
const path = require('path');

const nextData = JSON.parse(fs.readFileSync(path.join(__dirname, 'next_data_debug.json'), 'utf8'));

// Look for any keys containing summoner spells in pageProps
const pageProps = nextData.props.pageProps;
console.log('pageProps.summonerSpells keys:', Object.keys(pageProps.summonerSpells || {}));

// Let's search recursively for keys like 'spells' or 'summonerSpells' or lists of spell IDs
function searchForSpellArrays(obj, path = '') {
  if (!obj || typeof obj !== 'object') return;
  
  if (Array.isArray(obj)) {
    // If it's a short array of spell IDs like [4, 14] or [4, 12] or similar, let's print it!
    if (obj.length === 2 && obj.every(x => typeof x === 'number' && x >= 1 && x <= 21)) {
      console.log(`Found length-2 spell-like array at ${path}:`, obj);
    }
    obj.forEach((item, index) => searchForSpellArrays(item, `${path}[${index}]`));
    return;
  }
  
  // If it's an object with keys like spell1, spell2, spell1Id, spell2Id, etc.
  const keys = Object.keys(obj);
  if (keys.includes('spell1Id') && keys.includes('spell2Id')) {
    console.log(`Found spell1Id/spell2Id at ${path}:`, obj.spell1Id, obj.spell2Id);
  }
  
  for (const k of keys) {
    searchForSpellArrays(obj[k], `${path}.${k}`);
  }
}

searchForSpellArrays(pageProps);
