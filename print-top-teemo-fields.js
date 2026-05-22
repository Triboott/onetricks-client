const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('teemo_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;

console.log('--- patchStats ---');
console.log(pp.patchStats);

console.log('--- popRole ---');
console.log(pp.popRole);
