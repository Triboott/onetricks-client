const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('teemo_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;
const pData = pp.firstItemStats['16.10'].all;

console.log('popKeystone:', JSON.stringify(pData.popKeystone, null, 2));
console.log('popTree:', JSON.stringify(pData.popTree, null, 2));

// Sum of all builds for each keystone in popRunes
console.log('\n--- popRunes summary ---');
Object.keys(pData.popRunes).forEach(keystoneId => {
  const builds = pData.popRunes[keystoneId];
  let sum = 0;
  builds.forEach(b => sum += b[1]);
  console.log(`Keystone ${keystoneId}: ${builds.length} builds, sum of build[1] = ${sum}`);
});
