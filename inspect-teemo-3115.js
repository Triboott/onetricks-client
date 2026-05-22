const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('teemo_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;
const pData = pp.firstItemStats['16.10']['3115'];

if (pData) {
  console.log('popKeystone:', JSON.stringify(pData.popKeystone));
  console.log('popTree:', JSON.stringify(pData.popTree));
  
  // Sum of all builds for each keystone in popRunes
  console.log('\n--- popRunes builds for 3115 ---');
  Object.keys(pData.popRunes).forEach(keystoneId => {
    const builds = pData.popRunes[keystoneId];
    builds.forEach((b, idx) => {
      // build[2] is [primary, sub, keystone]
      console.log(`Keystone ${keystoneId}, Build ${idx + 1}: ${b[2][0]} + ${b[2][1]} -> playrate raw = ${b[1]}`);
    });
  });
}
