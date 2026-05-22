const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('veigar_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;
const pKey = Object.keys(pp.firstItemStats || {}).sort((a, b) => {
  if (a === 'all') return 1;
  if (b === 'all') return -1;
  return b.localeCompare(a, undefined, { numeric: true });
})[0];
const pData = pp.firstItemStats[pKey];

if (pData && pData.all) {
  console.log('Veigar popKeystone:', JSON.stringify(pData.all.popKeystone));
  console.log('Veigar popTree:', JSON.stringify(pData.all.popTree));
}
