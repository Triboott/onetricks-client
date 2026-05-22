const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('c:/Users/crist/Documents/onetricks/onetricks-client/teemo_nextData.json', 'utf8'));

const targets = [0.257, 0.248, 0.184, 0.147, 25.7, 24.8, 18.4, 14.7];
const results = [];

function search(obj, path = 'root') {
  if (obj === null || obj === undefined) return;
  
  if (typeof obj === 'number') {
    targets.forEach(target => {
      // Check absolute value or percentage
      let val = obj;
      if (val > 0 && val < 1) {
        val = val * 100;
      }
      if (Math.abs(val - target) < 0.1) {
        results.push({ path, value: obj, calculatedPercent: val, target });
      }
    });
  } else if (Array.isArray(obj)) {
    obj.forEach((item, idx) => search(item, `${path}[${idx}]`));
  } else if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      search(obj[key], `${path}.${key}`);
    }
  }
}

search(nextData);

console.log('Total matches found:', results.length);
results.forEach(r => {
  console.log(`Path: ${r.path}`);
  console.log(`  Raw: ${r.value} | Pct: ${r.calculatedPercent.toFixed(2)}% | Target: ${r.target}`);
});
