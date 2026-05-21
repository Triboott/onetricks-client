const fs = require('fs');
const path = require('path');

const pageProps = JSON.parse(fs.readFileSync('page_props.json', 'utf8'));

console.log('championData keys:', Object.keys(pageProps.championData || {}));
if (pageProps.championData) {
  console.log('championData.stats keys:', Object.keys(pageProps.championData.stats || {}));
  console.log('championData.stats.runes:', pageProps.championData.stats.runes);
  console.log('championData.stats.summonerSpells:', pageProps.championData.stats.summonerSpells);
}

console.log('runeStats keys/length:', Array.isArray(pageProps.runeStats) ? pageProps.runeStats.length : typeof pageProps.runeStats);
if (Array.isArray(pageProps.runeStats)) {
  console.log('First runeStat item:', JSON.stringify(pageProps.runeStats[0], null, 2));
}
