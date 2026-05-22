const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('teemo_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;

Object.keys(pp.firstItemStats).forEach(patch => {
  const patchData = pp.firstItemStats[patch];
  Object.keys(patchData).forEach(role => {
    const rData = patchData[role];
    if (rData && rData.popKeystone) {
      console.log(`Patch: ${patch}, Role: ${role}`);
      console.log('  popKeystone:', JSON.stringify(rData.popKeystone));
      if (rData.popTree) {
        console.log('  popTree:', JSON.stringify(rData.popTree));
      }
    }
  });
});
