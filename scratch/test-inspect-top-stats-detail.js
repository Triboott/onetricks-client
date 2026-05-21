const fs = require('fs');
const path = require('path');

const nextData = JSON.parse(fs.readFileSync(path.join(__dirname, '../next_data_debug.json'), 'utf8'));
const topStats = nextData.props.pageProps.firstItemStats.all.top;

console.log('topStats:', JSON.stringify(topStats, null, 2));
