const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');

// Find all matches of data-tooltip-html or data-tooltip with <b>...</b>
const tooltipRegex = /data-tooltip(?:-html)?="[^"]*?<b>([^<]+)<\/b>/g;
let match;
const tooltipTitles = [];

while ((match = tooltipRegex.exec(html)) !== null) {
  tooltipTitles.push(match[1]);
}

console.log(`Total tooltip titles found: ${tooltipTitles.length}`);
console.log('Titles:', tooltipTitles);
