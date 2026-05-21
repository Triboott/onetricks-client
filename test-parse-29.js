const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');

const term = 'Absorber vida';
let idx = 0;
while ((idx = html.indexOf(term, idx)) !== -1) {
  console.log('\nFound Absorber vida:');
  const start = Math.max(0, idx - 150);
  const end = Math.min(html.length, idx + term.length + 150);
  console.log(html.slice(start, end));
  idx += term.length;
}
