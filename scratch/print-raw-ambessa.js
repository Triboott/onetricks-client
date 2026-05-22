const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('ambessa_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;

console.log('firstItemStats patch keys:', Object.keys(pp.firstItemStats));

Object.keys(pp.firstItemStats).forEach(pk => {
  console.log(`\n=== Patch: ${pk} ===`);
  const patchData = pp.firstItemStats[pk];
  console.log('  keys:', Object.keys(patchData));
  
  Object.keys(patchData).forEach(ik => {
    const pData = patchData[ik];
    console.log(`    Item: ${ik}`);
    if (pData) {
      console.log(`      popTree:`, pData.popTree);
      console.log(`      popKeystone:`, pData.popKeystone);
      console.log(`      popRunes keys:`, Object.keys(pData.popRunes || {}));
    }
  });
});
