const fs = require('fs');
const path = require('path');

const nextData = JSON.parse(fs.readFileSync(path.join(__dirname, 'next_data_debug.json'), 'utf8'));
const patchStats = nextData.props.pageProps.patchStats;

console.log('patchStats keys:', Object.keys(patchStats || {}));
// Let's print one of the values, e.g. the first key
const patchKeys = Object.keys(patchStats || {});
if (patchKeys.length > 0) {
  const firstVal = patchStats[patchKeys[0]];
  console.log(`patchStats["${patchKeys[0]}"] keys:`, Object.keys(firstVal));
  
  // Let's search inside firstVal for popular runes
  for (const k of Object.keys(firstVal)) {
    const v = firstVal[k];
    if (v && typeof v === 'object') {
      console.log(`  patchStats["${patchKeys[0]}"].${k} keys:`, Object.keys(v).slice(0, 10));
    }
  }
}
