const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('veigar_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;

const patchKeys = Object.keys(pp.firstItemStats || {});
console.log('Original keys:', patchKeys);

const sortedKeys = patchKeys.sort((a, b) => {
  if (a === 'all') return 1;
  if (b === 'all') return -1;
  return b.localeCompare(a, undefined, { numeric: true });
});
console.log('Sorted keys:', sortedKeys);

sortedKeys.forEach(key => {
  const pData = pp.firstItemStats[key];
  if (pData && pData.all && pData.all.popTree) {
    console.log(`\nPatch key: ${key}`);
    console.log('popTree:', pData.all.popTree.slice(0, 4));
  }
});
