const fs = require('fs');
const path = require('path');

const pageProps = JSON.parse(fs.readFileSync('page_props.json', 'utf8'));

const teemoData = pageProps.championData.Teemo;
console.log('Teemo data keys:', Object.keys(teemoData || {}));
if (teemoData) {
  // Let's write Teemo data to a separate file for inspect
  fs.writeFileSync('teemo_data.json', JSON.stringify(teemoData, null, 2));
  console.log('Saved teemo_data.json!');
}
