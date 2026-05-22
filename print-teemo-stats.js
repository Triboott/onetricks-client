const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('teemo_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;

console.log('--- patchStats ---');
console.log(JSON.stringify(pp.patchStats, null, 2));

console.log('--- popRole ---');
console.log(JSON.stringify(pp.popRole, null, 2));

console.log('--- runeStats if any ---');
if (pp.runeStats) {
  console.log(JSON.stringify(pp.runeStats, null, 2));
}

console.log('--- championData if any ---');
if (pp.championData) {
  console.log(JSON.stringify(pp.championData, null, 2));
}
