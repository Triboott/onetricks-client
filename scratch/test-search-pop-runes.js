const fs = require('fs');
const path = require('path');

const nextData = JSON.parse(fs.readFileSync(path.join(__dirname, '../next_data_debug.json'), 'utf8'));

function search(obj, currentPath = '') {
  if (!obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => search(item, `${currentPath}[${index}]`));
    return;
  }

  const keys = Object.keys(obj);
  if (keys.includes('popKeystone') || keys.includes('popRunes')) {
    console.log(`Found build stats at path: ${currentPath}`);
    console.log('Keys:', keys);
    console.log('popKeystone:', JSON.stringify(obj.popKeystone));
    console.log('popTree:', JSON.stringify(obj.popTree));
    console.log('--------------------------------------------------\n');
  }

  for (const k of keys) {
    search(obj[k], `${currentPath}.${k}`);
  }
}

console.log('Searching for build statistics paths...');
search(nextData.props);
