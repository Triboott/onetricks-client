const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('veigar_nextData.json', 'utf8'));

const matches = [];

function search(obj, path = 'root') {
  if (obj === null || obj === undefined) return;
  
  if (typeof obj === 'number') {
    const valPercent = obj < 1.0 ? obj * 100 : obj;
    const rounded = Math.round(valPercent * 10) / 10; // 1 decimal place
    const roundedInt = Math.round(valPercent);
    if (roundedInt === 11 || roundedInt === 9 || roundedInt === 8) {
      matches.push({ path, value: obj, roundedPercent: rounded });
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, idx) => search(item, `${path}[${idx}]`));
  } else if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key === 'matchHistory') continue; // Skip match history
      search(obj[key], `${path}.${key}`);
    }
  }
}

search(nextData.props.pageProps);

console.log(`Found ${matches.length} matches (excluding matchHistory):`);
matches.forEach(m => {
  console.log(`- Path: ${m.path}, Value: ${m.value} (${m.roundedPercent}%)`);
});
