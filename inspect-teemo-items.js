const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('teemo_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;
const pData = pp.firstItemStats['16.10'];

if (pData) {
  Object.keys(pData).forEach(itemKey => {
    if (itemKey !== 'all' && itemKey !== 'top') {
      console.log(`Item ID: ${itemKey}, playrate = ${pData[itemKey].playrate}`);
    }
  });
}
