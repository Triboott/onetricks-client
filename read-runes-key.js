const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('veigar_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;

console.log('runes keys:', pp.runes ? Object.keys(pp.runes) : 'NO RUNES');
if (pp.runes) {
  console.log('runes sample:', JSON.stringify(pp.runes, null, 2).substring(0, 1000));
}
