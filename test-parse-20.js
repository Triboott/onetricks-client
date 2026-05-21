const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');

// Find summoner spells in html
const spells = ['Destello', 'Prender', 'Aplastar', 'Curar', 'Barrera', 'Extenuación', 'Teleportar', 'Claridad', 'Purificar'];
spells.forEach(spell => {
  const term = `<b>${spell}</b>`;
  let idx = 0;
  let matchCount = 0;
  while ((idx = html.indexOf(spell, idx)) !== -1) {
    matchCount++;
    console.log(`\nSpell match: "${spell}" (${matchCount}):`);
    const start = Math.max(0, idx - 150);
    const end = Math.min(html.length, idx + spell.length + 150);
    console.log(html.slice(start, end));
    idx += spell.length;
  }
});
