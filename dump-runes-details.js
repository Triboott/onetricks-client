const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('veigar_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;
const patchData = pp.firstItemStats['16.10'];

console.log('--- ALL STATS FOR all ---');
if (patchData && patchData.all) {
  console.log('keys in all:', Object.keys(patchData.all));
  console.log('all.playrate:', patchData.all.playrate);
  console.log('all.count:', patchData.all.count);
  console.log('all.popTree total length:', patchData.all.popTree.length);
  console.log('all.popTree entries:');
  patchData.all.popTree.forEach((entry, idx) => {
    // entry is [primaryStyleId, subStyleId, keystoneId, count/playrate]
    console.log(`  [${idx}] entry:`, entry);
  });
  
  console.log('\n--- popRunes keys (keystones) and counts ---');
  for (const keystone of Object.keys(patchData.all.popRunes)) {
    const builds = patchData.all.popRunes[keystone];
    console.log(`  Keystone ${keystone}: ${builds.length} builds`);
    builds.forEach((build, bIdx) => {
      // build is [runesList, count, [primary, sub, keystone]]
      console.log(`    [${bIdx}] playrate/count=${build[1]}, runes=[${build[0].join(', ')}], meta=[${build[2]?.join(', ')}]`);
    });
  }
}
