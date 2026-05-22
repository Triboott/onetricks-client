const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('ambessa_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;

const pData = pp.firstItemStats['16.10']['6698'];
console.log('Item 6698 keys:', Object.keys(pData));
console.log('Item 6698 playrate:', pData.playrate);

console.log('firstItemStats["16.10"].all.popularItems:', pp.firstItemStats['16.10'].all.popularItems);
