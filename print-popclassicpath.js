const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('veigar_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;
const pData = pp.firstItemStats['16.10'];

if (pData && pData.all) {
  console.log('--- popClassicPath ---');
  console.log(JSON.stringify(pData.all.popClassicPath, null, 2));
}
