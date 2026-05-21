const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');

const regex = /<div class="([^"]*)"[^>]*data-tooltip-html="<small><b>([^<]+)<\/b>/g;
let match;
while ((match = regex.exec(html)) !== null) {
  const className = match[1];
  const name = match[2];
  if (['Absorber vida', 'Triunfo', 'Claridad mental'].includes(name)) {
    console.log(`Rune: "${name}", class: "${className}"`);
  }
}
