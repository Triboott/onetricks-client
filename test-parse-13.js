const fs = require('fs');
const path = require('path');

const pageProps = JSON.parse(fs.readFileSync('page_props.json', 'utf8'));

for (const key of Object.keys(pageProps)) {
  const val = pageProps[key];
  if (!val) {
    console.log(`${key}: null/undefined`);
  } else if (Array.isArray(val)) {
    console.log(`${key}: Array of length ${val.length}`);
  } else if (typeof val === 'object') {
    console.log(`${key}: Object with ${Object.keys(val).length} keys`);
  } else {
    console.log(`${key}: ${typeof val} (${val})`);
  }
}
