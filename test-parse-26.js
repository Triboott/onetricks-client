const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');

const regex = /velocidad de ataque/gi;
let match;
let count = 0;

while ((match = regex.exec(html)) !== null) {
  count++;
  console.log(`\nMatch ${count} at index ${match.index}:`);
  const start = Math.max(0, match.index - 150);
  const end = Math.min(html.length, match.index + match[0].length + 150);
  console.log(html.slice(start, end));
}
