const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');

// Find all elements with perk-images or StatMods in their html
const regex = /<([a-z0-9]+)[^>]*(StatMods|perk-images\/StatMods)[^>]*>/gi;
let match;
let count = 0;
while ((match = regex.exec(html)) !== null && count < 10) {
  count++;
  console.log(`\nMatch ${count}:`);
  console.log(match[0]);
}
