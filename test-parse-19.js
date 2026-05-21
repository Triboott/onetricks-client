const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');

// Find all HTML blocks containing "data-tooltip-html" and examine their structure
const elementRegex = /<div[^>]*data-tooltip-html="<small><b>([^<]+)<\/b>[^"]*"[^>]*>/g;
let match;

console.log('Inspecting div structures for runes...');
while ((match = elementRegex.exec(html)) !== null) {
  const name = match[1];
  const fullTag = match[0];
  // Only print for a few runes to see the class names
  if (['Ataque intensificado', 'Pies veloces', 'Conquistador', 'Absorber vida', 'Triunfo', 'Revestimiento de huesos'].includes(name)) {
    console.log(`\nRune: "${name}"`);
    console.log(`Tag: ${fullTag}`);
  }
}
