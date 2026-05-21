const fs = require('fs');
const path = require('path');

const nextData = JSON.parse(fs.readFileSync(path.join(__dirname, 'next_data_debug.json'), 'utf8'));
const props = nextData.props;

console.log('Top level props keys:', Object.keys(props || {}));
if (props.pageProps) {
  console.log('pageProps keys:', Object.keys(props.pageProps));
  
  // Look for any keys containing runes, build, stats, popular, etc.
  for (const k of Object.keys(props.pageProps)) {
    const val = props.pageProps[k];
    if (val && typeof val === 'object') {
      console.log(`pageProps.${k} keys:`, Object.keys(val).slice(0, 10));
    }
  }
}
