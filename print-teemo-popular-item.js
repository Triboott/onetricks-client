const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('teemo_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;
const pData = pp.firstItemStats['16.10']['6653'];

if (pData) {
  console.log('--- popTree under first item 6653 ---');
  console.log(pData.popTree);
  
  console.log('--- popKeystone under first item 6653 ---');
  console.log(pData.popKeystone);
  
  console.log('--- popRunes under first item 6653 ---');
  if (pData.popRunes) {
    for (const k of Object.keys(pData.popRunes)) {
      console.log(`Keystone ${k}:`);
      pData.popRunes[k].forEach(b => {
        console.log(`  Combo: ${b[2].join(', ')} -> Playrate: ${(b[1] * 100).toFixed(2)}%`);
      });
    }
  }
}
