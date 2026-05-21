const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');

// Search for any div containing "StatMods" in the style attribute
const regex = /<div[^>]*StatMods[^>]*>/gi;
let match;
while ((match = regex.exec(html)) !== null) {
  console.log('Found StatMod div:', match[0]);
}
