const fs = require('fs');
const path = require('path');

const nextData = JSON.parse(fs.readFileSync(path.join(__dirname, 'next_data_debug.json'), 'utf8'));
const firstItemStats = nextData.props.pageProps.firstItemStats;

console.log('firstItemStats keys:', Object.keys(firstItemStats || {}));

// Let's inspect firstItemStats.all.all or firstItemStats["16.10"].all
const subKeys = Object.keys(firstItemStats || {});
subKeys.forEach(k => {
  const val = firstItemStats[k];
  if (val && typeof val === 'object') {
    console.log(`firstItemStats["${k}"] keys:`, Object.keys(val));
    if (val.all) {
      console.log(`  firstItemStats["${k}"].all keys:`, Object.keys(val.all));
      if (val.all.all) {
        console.log(`    firstItemStats["${k}"].all.all keys:`, Object.keys(val.all.all));
        console.log(`    firstItemStats["${k}"].all.all.popStat:`, val.all.all.popStat);
        console.log(`    firstItemStats["${k}"].all.all.popSpells:`, val.all.all.popSpells);
      }
    }
  }
});
