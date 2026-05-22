const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('veigar_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;
const pKey = Object.keys(pp.firstItemStats || {}).sort((a, b) => {
  if (a === 'all') return 1;
  if (b === 'all') return -1;
  return b.localeCompare(a, undefined, { numeric: true });
})[0];
const pData = pp.firstItemStats[pKey];

console.log('Patch version:', pKey);

const items = ['6655', '6657'];
items.forEach(item => {
  const itemData = pData[item];
  if (itemData) {
    console.log(`\n--- Item: ${item} ---`);
    const tree = itemData.popTree;
    const runes = itemData.popRunes;
    tree.forEach((entry, idx) => {
      const primary = entry[0];
      const sub = entry[1];
      const keystone = entry[2];
      
      let sumPlayrate = 0;
      const builds = runes[keystone] || [];
      builds.forEach(build => {
        if (build[2] && build[2][0] === primary && build[2][1] === sub) {
          sumPlayrate += build[1];
        }
      });
      console.log(`Set ${idx + 1}: [Primary: ${primary}, Sub: ${sub}, Keystone: ${keystone}] -> Playrate: ${(sumPlayrate * 100).toFixed(2)}%`);
    });
  }
});
