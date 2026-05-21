const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');

const term = 'Ataque intensificado';
let idx = 0;
let matchCount = 0;

while ((idx = html.indexOf(term, idx)) !== -1) {
  matchCount++;
  console.log(`\nMatch ${matchCount} at index ${idx}:`);
  const start = Math.max(0, idx - 250);
  const end = Math.min(html.length, idx + term.length + 250);
  console.log(html.slice(start, end));
  idx += term.length;
}
