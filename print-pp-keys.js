const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('teemo_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;

console.log('--- pageProps keys ---');
console.log(Object.keys(pp));

console.log('--- champion ---');
console.log(pp.champion);

console.log('--- role ---');
console.log(pp.role);

console.log('--- firstItemStats.all keys if any ---');
if (pp.firstItemStats && pp.firstItemStats.all) {
  console.log(Object.keys(pp.firstItemStats.all));
}
