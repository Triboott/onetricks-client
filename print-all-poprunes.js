const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('veigar_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;
const patchData = pp.firstItemStats['16.10'];

if (patchData) {
  for (const itemKey of Object.keys(patchData)) {
    if (itemKey === 'top') continue;
    const item = patchData[itemKey];
    console.log(`\n================ ITEM: ${itemKey} ================`);
    console.log(`playrate = ${item.playrate}`);
    const tree = item.popTree;
    const runes = item.popRunes;
    if (!tree || !runes) continue;
    
    // Sum playrates for builds matching this combination
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
}
