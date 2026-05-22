const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('teemo_nextData.json', 'utf8'));

const targets = [18.4, 24.8, 25.7, 68.9, 14.7];
const results = [];

function search(obj, path = 'root') {
  if (obj === null || obj === undefined) return;
  
  if (typeof obj === 'number') {
    const percentVal = obj * 100;
    targets.forEach(target => {
      if (Math.abs(obj - target) < 0.1 || Math.abs(percentVal - target) < 0.1) {
        results.push({ path, value: obj, target });
      }
    });
  } else if (Array.isArray(obj)) {
    obj.forEach((item, idx) => search(item, `${path}[${idx}]`));
  } else if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key === 'matchHistory') continue;
      search(obj[key], `${path}.${key}`);
    }
  }
}

search(nextData.props.pageProps);

console.log('Matches for targets:', targets);
results.forEach(r => {
  console.log(`- Path: ${r.path}, Value: ${r.value} (Target: ${r.target})`);
});
