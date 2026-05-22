const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('teemo_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;
const pData = pp.firstItemStats['16.10'];

if (pData) {
  console.log('--- KEYS under 16.10 ---');
  console.log(Object.keys(pData));
  
  if (pData.all) {
    console.log('\n--- KEYS under 16.10.all ---');
    console.log(Object.keys(pData.all));
    
    console.log('\n--- popTree ---');
    console.log(JSON.stringify(pData.all.popTree, null, 2));
    
    console.log('\n--- popKeystone ---');
    console.log(JSON.stringify(pData.all.popKeystone, null, 2));
    
    console.log('\n--- popClassicPath ---');
    console.log(JSON.stringify(pData.all.popClassicPath, null, 2));
    
    console.log('\n--- first few builds of popRunes key 8128 ---');
    console.log(JSON.stringify((pData.all.popRunes['8128'] || []).slice(0, 3), null, 2));
    
    console.log('\n--- first few builds of popRunes key 8005 ---');
    console.log(JSON.stringify((pData.all.popRunes['8005'] || []).slice(0, 3), null, 2));
  }
}
