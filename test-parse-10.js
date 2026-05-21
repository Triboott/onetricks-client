const fs = require('fs');
const path = require('path');

const runes = JSON.parse(fs.readFileSync('page_runes.json', 'utf8'));

console.log('runes.keystone keys:', Object.keys(runes.keystone || {}));
console.log('runes.subStyle keys:', Object.keys(runes.subStyle || {}));

// Print detailed examples of keystone structures
const keystoneKeys = Object.keys(runes.keystone || {});
if (keystoneKeys.length > 0) {
  console.log(`runes.keystone["${keystoneKeys[0]}"]:`, JSON.stringify(runes.keystone[keystoneKeys[0]], null, 2));
}

const subStyleKeys = Object.keys(runes.subStyle || {});
if (subStyleKeys.length > 0) {
  console.log(`runes.subStyle["${subStyleKeys[0]}"]:`, JSON.stringify(runes.subStyle[subStyleKeys[0]], null, 2));
}
