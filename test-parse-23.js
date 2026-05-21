const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');

// Regex to find all divs with data-tooltip-html that do NOT have builds_nonActiveRune class
const divRegex = /<div class="([^"]*)"[^>]*data-tooltip-html="<small><b>([^<]+)<\/b>/g;
let match;
const active = [];
const inactive = [];

while ((match = divRegex.exec(html)) !== null) {
  const className = match[1];
  const name = match[2];
  if (className.includes('nonActiveRune')) {
    inactive.push(name);
  } else {
    active.push(name);
  }
}

console.log('Active elements with tooltips:', active);
