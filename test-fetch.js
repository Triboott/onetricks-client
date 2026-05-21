const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://www.onetricks.gg/es/champions/Teemo';

https.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    // Find __NEXT_DATA__
    const match = data.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (match) {
      try {
        const nextData = JSON.parse(match[1]);
        fs.writeFileSync(path.join(__dirname, 'next_data_teemo.json'), JSON.stringify(nextData, null, 2), 'utf8');
        console.log('Success! Saved __NEXT_DATA__ to next_data_teemo.json');
      } catch (err) {
        console.error('Failed to parse __NEXT_DATA__ JSON:', err);
      }
    } else {
      console.log('__NEXT_DATA__ script tag not found! Checking if page was blocked (Cloudflare). Length of page:', data.length);
      fs.writeFileSync(path.join(__dirname, 'page_source.html'), data, 'utf8');
      if (data.includes('Cloudflare') || data.includes('Just a moment')) {
        console.log('Page is blocked by Cloudflare.');
      }
    }
  });
}).on('error', (err) => {
  console.error('Error fetching page:', err);
});
