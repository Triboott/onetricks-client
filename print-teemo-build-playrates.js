const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('teemo_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;
const pData = pp.firstItemStats['16.10'].all;

if (pData) {
  Object.keys(pData.popRunes).forEach(keystoneId => {
    console.log(`Keystone ${keystoneId}:`);
    pData.popRunes[keystoneId].forEach((b, idx) => {
      console.log(`  Build ${idx + 1}: ${b[2].join(', ')} -> Playrate = ${(b[1] * 100).toFixed(1)}%`);
    });
  });
}
