const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('veigar_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;

console.log('pp keys:', Object.keys(pp));
// Let's dump champion details
console.log('champion:', pp.champion);
console.log('role:', pp.role);
console.log('roleStats:', pp.roleStats);

// Let's look at popClassicPath, popTree under pp.firstItemStats
const pData = pp.firstItemStats['16.10'];

for (const key of Object.keys(pData)) {
  if (pData[key].popTree) {
     console.log(`\nItem key: ${key}`);
     console.log(`popTree length: ${pData[key].popTree.length}`);
     console.log(`popTree first 3:`, pData[key].popTree.slice(0, 3));
  }
}
