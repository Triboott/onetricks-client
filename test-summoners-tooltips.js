const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');

const spells = ['Destello', 'Prender', 'Aplastar', 'Curar', 'Barrera', 'Extenuación', 'Teleportar', 'Claridad', 'Purificar', 'Fantasmal'];

// Let's find all HTML tags in scraped_debug.html that contain any summoner spell name in their attributes
const tagRegex = /<([a-z0-9]+)\s+([^>]*)(Destello|Prender|Aplastar|Curar|Barrera|Extenuación|Teleportar|Claridad|Purificar|Fantasmal)([^>]*)>/gi;
let match;
let count = 0;
while ((match = tagRegex.exec(html)) !== null && count < 15) {
  count++;
  console.log(`\nMatch ${count}: Tag: ${match[1]}`);
  console.log('Attributes:', match[2] + match[3] + match[4]);
}
