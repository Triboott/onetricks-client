const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('teemo_nextData.json', 'utf8'));

const targets = [25.7, 24.8, 18.4, 14.7];
const results = [];

function search(obj, path = 'root') {
  if (obj === null || obj === undefined) return;
  
  if (typeof obj === 'number') {
    // Check direct number or decimal fraction
    const directVal = obj;
    const percentVal = obj * 100;
    
    targets.forEach(target => {
      if (Math.abs(directVal - target) < 0.05 || Math.abs(percentVal - target) < 0.05) {
        results.push({ path, value: obj, target });
      }
    });
  } else if (Array.isArray(obj)) {
    obj.forEach((item, idx) => search(item, `${path}[${idx}]`));
  } else if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key === 'matchHistory') continue; // Skip huge stuff
      search(obj[key], `${path}.${key}`);
    }
  }
}

search(nextData.props.pageProps);

console.log('Matches for targets:', targets);
results.forEach(r => {
  console.log(`- Path: ${r.path}, Value: ${r.value} (Target: ${r.target})`);
});
