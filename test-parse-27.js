const fs = require('fs');
const path = require('path');

const pageProps = JSON.parse(fs.readFileSync('page_props.json', 'utf8'));
const match = pageProps.matchHistory[0];

// Let's recursively find any numbers that look like rune IDs (8000-9999) or stat shard IDs (5000-5020)
const foundIds = new Set();
function scan(obj) {
  if (!obj) return;
  if (typeof obj === 'number') {
    if ((obj >= 8000 && obj <= 9999) || (obj >= 5001 && obj <= 5013)) {
      foundIds.add(obj);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach(scan);
  } else if (typeof obj === 'object') {
    Object.values(obj).forEach(scan);
  }
}

scan(match);
console.log('Rune & Stat Shard IDs found in the first match history item:', Array.from(foundIds));
