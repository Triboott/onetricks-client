const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('veigar_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;
const patchData = pp.firstItemStats['16.10'];

if (patchData) {
  console.log('--- ALL popKeystone ---');
  if (patchData.all && patchData.all.popKeystone) {
    console.log('all.popKeystone:', patchData.all.popKeystone);
  }
  
  console.log('\n--- 6657 popKeystone ---');
  if (patchData['6657'] && patchData['6657'].popKeystone) {
    console.log('6657.popKeystone:', patchData['6657'].popKeystone);
  }

  console.log('\n--- 6655 popKeystone ---');
  if (patchData['6655'] && patchData['6655'].popKeystone) {
    console.log('6655.popKeystone:', patchData['6655'].popKeystone);
  }
}
