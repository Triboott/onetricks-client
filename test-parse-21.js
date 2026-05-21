const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');

// Find all matches of summoner or spell image tags or classes
const regex = /<img[^>]+(?:summoner|spell)[^>]+>/gi;
let match;
const tags = [];

while ((match = regex.exec(html)) !== null) {
  tags.push(match[0]);
}

console.log(`Found summoner/spell image tags: ${tags.length}`);
tags.forEach((tag, idx) => console.log(`${idx}: ${tag}`));
