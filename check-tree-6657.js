const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('veigar_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;
const patchData = pp.firstItemStats['16.10'];

if (patchData && patchData['6657']) {
  console.log('--- 6657.popTree ---');
  patchData['6657'].popTree.forEach((entry, idx) => {
    console.log(`[${idx}] entry:`, entry);
  });
}
