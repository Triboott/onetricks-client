const fs = require('fs');
const path = require('path');

const pageProps = JSON.parse(fs.readFileSync('page_props.json', 'utf8'));

console.log('patchStats.all keys:', Object.keys(pageProps.patchStats.all || {}));
if (pageProps.patchStats.all) {
  console.log('patchStats.all.runes keys/length:', Array.isArray(pageProps.patchStats.all.runes) ? pageProps.patchStats.all.runes.length : typeof pageProps.patchStats.all.runes);
  if (Array.isArray(pageProps.patchStats.all.runes)) {
    console.log('First 2 items in patchStats.all.runes:', JSON.stringify(pageProps.patchStats.all.runes.slice(0, 2), null, 2));
  } else {
    // If it's an object, dump keys
    console.log('patchStats.all.runes keys:', Object.keys(pageProps.patchStats.all.runes));
    // Let's print one
    const firstKey = Object.keys(pageProps.patchStats.all.runes)[0];
    console.log(`patchStats.all.runes["${firstKey}"]:`, JSON.stringify(pageProps.patchStats.all.runes[firstKey], null, 2));
  }
}
