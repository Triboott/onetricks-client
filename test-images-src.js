const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');

const regex = /<img[^>]+src="([^"]*)"[^>]*>/gi;
let match;
let count = 0;
while ((match = regex.exec(html)) !== null) {
  count++;
  console.log(`Image ${count}: ${match[1]}`);
}
