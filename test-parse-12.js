const fs = require('fs');
const path = require('path');

const pageProps = JSON.parse(fs.readFileSync('page_props.json', 'utf8'));

for (const key of Object.keys(pageProps.patchStats)) {
  const obj = pageProps.patchStats[key];
  console.log(`patchStats["${key}"] keys:`, Object.keys(obj || {}));
  if (obj && Object.keys(obj).length > 0) {
    fs.writeFileSync(`patch_stats_${key}.json`, JSON.stringify(obj, null, 2));
    console.log(`Saved patch_stats_${key}.json!`);
  }
}
