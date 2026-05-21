const fs = require('fs');
const path = require('path');

const pageProps = JSON.parse(fs.readFileSync('page_props.json', 'utf8'));

console.log('runeStats is array:', Array.isArray(pageProps.runeStats));
if (Array.isArray(pageProps.runeStats)) {
  console.log('runeStats length:', pageProps.runeStats.length);
  // Log first 3 items
  console.log('runeStats[0]:', JSON.stringify(pageProps.runeStats[0], null, 2));
  console.log('runeStats[1]:', JSON.stringify(pageProps.runeStats[1], null, 2));
  console.log('runeStats[2]:', JSON.stringify(pageProps.runeStats[2], null, 2));
} else {
  console.log('runeStats:', pageProps.runeStats);
}
