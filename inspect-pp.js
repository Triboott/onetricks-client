const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('veigar_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;
const patchData = pp.firstItemStats['16.10'];

console.log('--- KEYS IN firstItemStats["16.10"] ---');
for (const key of Object.keys(patchData)) {
  const item = patchData[key];
  console.log(`- ${key}: playrate=${item.playrate}, count=${item.count}, has popTree=${!!item.popTree}, has popClassicPath=${!!item.popClassicPath}`);
}
