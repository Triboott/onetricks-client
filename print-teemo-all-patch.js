const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('teemo_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;
const pData = pp.firstItemStats['all'];

if (pData && pData.all) {
  console.log('--- popTree under patch all ---');
  console.log(pData.all.popTree);
  
  console.log('--- popKeystone under patch all ---');
  console.log(pData.all.popKeystone);
  
  console.log('--- popRunes under patch all ---');
  for (const k of Object.keys(pData.all.popRunes)) {
    console.log(`Keystone ${k}:`);
    pData.all.popRunes[k].forEach(b => {
      console.log(`  Combo: ${b[2].join(', ')} -> Playrate: ${(b[1] * 100).toFixed(2)}%`);
    });
  }
}
