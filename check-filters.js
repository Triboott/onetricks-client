const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('veigar_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;

console.log('pp.filters:', pp.filters);
console.log('pp.popRole:', pp.popRole);
console.log('pp.key:', pp.key);
