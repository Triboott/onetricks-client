const fs = require('fs');
const path = require('path');

const pageProps = JSON.parse(fs.readFileSync('page_props.json', 'utf8'));

console.log('runes keys:', Object.keys(pageProps.runes || {}));
if (pageProps.runes) {
  fs.writeFileSync('page_runes.json', JSON.stringify(pageProps.runes, null, 2));
  console.log('Saved page_runes.json!');
}
