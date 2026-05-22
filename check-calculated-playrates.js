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

// We want to check popTree and find the build playrates for 'all'
if (pData && pData.all) {
  const tree = pData.all.popTree;
  const runes = pData.all.popRunes;
  
  console.log('\n--- popTree Entries & Calculated Playrates ---');
  tree.forEach((entry, idx) => {
    const primary = entry[0];
    const sub = entry[1];
    const keystone = entry[2];
    
    // Sum playrates for builds matching this combination
    let sumPlayrate = 0;
    const builds = runes[keystone] || [];
    builds.forEach(build => {
      // build is [runesList, playrate, [primary, sub, keystone]]
      if (build[2] && build[2][0] === primary && build[2][1] === sub) {
        sumPlayrate += build[1];
      }
    });
    
    console.log(`Set ${idx + 1}: [Primary: ${primary}, Sub: ${sub}, Keystone: ${keystone}] -> Playrate: ${(sumPlayrate * 100).toFixed(2)}%`);
  });
}
