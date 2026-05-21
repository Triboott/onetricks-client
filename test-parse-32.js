const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');

const regexes = [/"5005"/g, /"5008"/g, /"5011"/g];
regexes.forEach(regex => {
  let match;
  let count = 0;
  while ((match = regex.exec(html)) !== null && count < 3) {
    count++;
    console.log(`\nMatch for ${regex.source} (${count}):`);
    const start = Math.max(0, match.index - 150);
    const end = Math.min(html.length, match.index + match[0].length + 150);
    console.log(html.slice(start, end));
  }
});
