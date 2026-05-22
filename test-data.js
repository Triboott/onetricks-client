const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('veigar_nextData.json', 'utf8'));

const pp = nextData.props.pageProps;
const patchKeys = Object.keys(pp.firstItemStats || {});
console.log('Patch keys:', patchKeys);

const pData = pp.firstItemStats[patchKeys[0]]; // latest patch
console.log('Available items under patch:', Object.keys(pData));

if (pData.all) {
  console.log('\n--- ALL (overall stats) ---');
  console.log('popTree:', pData.all.popTree.slice(0, 5));
}

const classicPath = pData.all?.popClassicPath;
console.log('\npopClassicPath:', JSON.stringify(classicPath, null, 2));
