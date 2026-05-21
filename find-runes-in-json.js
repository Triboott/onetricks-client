const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'next-data-dump.json'), 'utf8'));

// Common rune IDs:
// Styles: 8000, 8100, 8200, 8300, 8400
// Perks: 8005-8473, 9101-9999 etc.
// Stat mods: 5001, 5002, 5003, 5005, 5007, 5008

function isRuneId(id) {
  const n = parseInt(id);
  if (isNaN(n)) return false;
  return (n >= 8000 && n <= 9999) || (n >= 5001 && n <= 5008);
}

const pathsFound = [];

function search(obj, currentPath = 'root') {
  if (!obj || typeof obj !== 'object') return;

  // Check if it is an array of numbers that look like runes
  if (Array.isArray(obj)) {
    const allRunes = obj.every(x => isRuneId(x));
    const someRunes = obj.some(x => isRuneId(x));
    if (allRunes && obj.length >= 4) {
      pathsFound.push({ path: currentPath, type: 'array-all-runes', value: obj });
    } else if (someRunes && obj.length >= 6) {
      pathsFound.push({ path: currentPath, type: 'array-some-runes', value: obj });
    }
  }

  // Check if object has perk properties
  const keys = Object.keys(obj);
  const perkKeys = keys.filter(k => k.toLowerCase().includes('perk') || k.toLowerCase().includes('rune'));
  if (perkKeys.length > 0) {
    pathsFound.push({
      path: currentPath,
      type: 'object-with-perk-keys',
      keys: keys.slice(0, 10),
      sample: keys.reduce((acc, k) => {
        if (typeof obj[k] !== 'object') acc[k] = obj[k];
        return acc;
      }, {})
    });
  }

  // Recursively search
  for (const k of keys) {
    // Avoid circular or extremely large structures if they occur
    if (typeof obj[k] === 'object') {
      search(obj[k], `${currentPath}.${k}`);
    }
  }
}

search(data);

console.log(`Found ${pathsFound.length} potential rune paths:`);
console.log(JSON.stringify(pathsFound, null, 2));
