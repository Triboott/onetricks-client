const fs = require('fs');
const path = require('path');

const pageProps = JSON.parse(fs.readFileSync('page_props.json', 'utf8'));

console.log('patchStats keys:', Object.keys(pageProps.patchStats || {}));
if (pageProps.patchStats) {
  // Let's write to file
  fs.writeFileSync('patch_stats.json', JSON.stringify(pageProps.patchStats, null, 2));
}

console.log('matchHistory keys/length:', Array.isArray(pageProps.matchHistory) ? pageProps.matchHistory.length : typeof pageProps.matchHistory);
if (Array.isArray(pageProps.matchHistory) && pageProps.matchHistory.length > 0) {
  console.log('First matchHistory item keys:', Object.keys(pageProps.matchHistory[0]));
  fs.writeFileSync('match_history.json', JSON.stringify(pageProps.matchHistory.slice(0, 3), null, 2));
}

console.log('firstItemStats keys:', Object.keys(pageProps.firstItemStats || {}));
