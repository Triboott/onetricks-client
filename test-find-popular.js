const fs = require('fs');
const path = require('path');

const nextData = JSON.parse(fs.readFileSync(path.join(__dirname, 'next_data_debug.json'), 'utf8'));

function findKey(obj, targetKey, path = '') {
  if (!obj || typeof obj !== 'object') return null;
  
  if (obj[targetKey] !== undefined) {
    console.log(`Found ${targetKey} at: ${path}.${targetKey}`, obj[targetKey]);
  }
  
  for (const k of Object.keys(obj)) {
    findKey(obj[k], targetKey, `${path}.${k}`);
  }
}

findKey(nextData.props, 'popStat');
findKey(nextData.props, 'popRunes');
