const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');

// Let's search for Spanish names of runes or styles
const terms = [
  'Ataque intensificado', 'Pies veloces', 'Conquistador', 'Absorber vida', 'Triunfo',
  'Claridad mental', 'Presteza', 'Linaje', 'Derribado', 'Golpe de gracia',
  'Garras del inmortal', 'Revestimiento de huesos', 'Fuerzas renovadas', 'Sobrecrecimiento',
  'Brujería', 'Precisión', 'Valor', 'Dominación', 'Inspiración'
];

console.log('Searching text terms in HTML...');
terms.forEach(term => {
  const count = (html.match(new RegExp(term, 'gi')) || []).length;
  if (count > 0) {
    console.log(`- "${term}": found ${count} times`);
  }
});
