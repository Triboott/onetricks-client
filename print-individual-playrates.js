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

if (pData && pData.all) {
  const tree = pData.all.popTree;
  const runes = pData.all.popRunes;
  
  console.log('\n--- popTree Entries & Individual Build Playrates ---');
  tree.forEach((entry, idx) => {
    const primary = entry[0];
    const sub = entry[1];
    const keystone = entry[2];
    
    const builds = runes[keystone] || [];
    const matchingBuilds = builds.filter(b => b[2] && b[2][0] === primary && b[2][1] === sub);
    
    console.log(`\nSet ${idx + 1}: [Primary: ${primary}, Sub: ${sub}, Keystone: ${keystone}]`);
    matchingBuilds.forEach((build, bIdx) => {
      console.log(`  Build ${bIdx + 1}: Perks: ${build[0].join(', ')} -> Playrate: ${(build[1] * 100).toFixed(2)}%`);
    });
  });
}
