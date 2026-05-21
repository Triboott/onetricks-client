const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');

// Find all <img> tags and output their src and alt
const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
let match;
const imgs = [];

while ((match = imgRegex.exec(html)) !== null) {
  const src = match[1];
  // extract alt if present
  const altMatch = match[0].match(/alt="([^"]*)"/);
  const alt = altMatch ? altMatch[1] : '';
  imgs.push({ src, alt });
}

console.log(`Total image tags found: ${imgs.length}`);
// Let's filter those containing "perk-images" or "rune" or "Style" or "summoner"
const perkImgs = imgs.filter(img => img.src.includes('perk-images') || img.src.includes('summoner') || img.alt.includes('Rune') || img.src.includes('Styles'));
console.log(`Perk/Summoner image tags: ${perkImgs.length}`);
perkImgs.forEach((img, idx) => {
  console.log(`${idx}: src="${img.src}" alt="${img.alt}"`);
});
