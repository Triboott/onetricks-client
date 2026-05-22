const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('ambessa_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;

// Let's inspect Item 6698
const pData = pp.firstItemStats['16.10']['6698'];

console.log('--- raw popTree for Item 6698 ---');
console.log(pData.popTree);

console.log('\n--- raw popRunes keys for Item 6698 ---');
console.log(Object.keys(pData.popRunes || {}));

Object.keys(pData.popRunes || {}).forEach(k => {
  console.log(`\nKey ${k} builds count:`, pData.popRunes[k].length);
  pData.popRunes[k].forEach((b, idx) => {
    console.log(`  Build ${idx + 1}:`);
    console.log(`    playrate:`, b[1]);
    console.log(`    styles/keystone:`, b[2]);
    console.log(`    runes list:`, b[0]);
  });
});
