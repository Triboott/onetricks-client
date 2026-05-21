const fs = require('fs');
const path = require('path');

const nextData = JSON.parse(fs.readFileSync(path.join(__dirname, '../next_data_debug.json'), 'utf8'));
const topStats = nextData.props.pageProps.firstItemStats.all.top;

console.log('topStats exists:', !!topStats);
if (topStats) {
  console.log('topStats keys:', Object.keys(topStats));
  console.log('topStats.popKeystone:', topStats.popKeystone);
  console.log('topStats.popRunes keys:', topStats.popRunes ? Object.keys(topStats.popRunes) : 'undefined');
  console.log('topStats.popTree:', topStats.popTree);
  console.log('topStats.popStat:', topStats.popStat);
}
