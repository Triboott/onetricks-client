const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');
const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
const nextData = JSON.parse(match[1]);

console.log('pageProps keys:', Object.keys(nextData.props.pageProps));
if (nextData.props.pageProps.data) {
  console.log('pageProps.data keys:', Object.keys(nextData.props.pageProps.data));
  fs.writeFileSync('props_data.json', JSON.stringify(nextData.props.pageProps.data, null, 2));
} else {
  fs.writeFileSync('page_props.json', JSON.stringify(nextData.props.pageProps, null, 2));
}
console.log('Saved data to json for inspection!');
