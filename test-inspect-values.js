const fs = require('fs');
const path = require('path');

const nextData = JSON.parse(fs.readFileSync(path.join(__dirname, 'next_data_debug.json'), 'utf8'));
const allStats = nextData.props.pageProps.firstItemStats.all.all;

console.log('--- sSpells (Summoner Spells) ---');
console.log(JSON.stringify(allStats.sSpells, null, 2));

console.log('\n--- popStat (Stat Shards) ---');
console.log(JSON.stringify(allStats.popStat, null, 2));

console.log('\n--- popTree (Primary / Secondary trees) ---');
console.log(JSON.stringify(allStats.popTree, null, 2));

console.log('\n--- popRunes ---');
console.log(JSON.stringify(allStats.popRunes, null, 2));
