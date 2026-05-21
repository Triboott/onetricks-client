const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');

const terms = [
  'Aceleración de habilidad', 'Velocidad de ataque', 'Fuerza adaptable',
  'Armadura', 'Resistencia mágica', 'Vida'
];

terms.forEach(term => {
  const count = (html.match(new RegExp(term, 'gi')) || []).length;
  console.log(`"${term}": found ${count} times`);
});
