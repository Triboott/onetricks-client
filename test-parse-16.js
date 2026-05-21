const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');

// Find all lines containing "Ataque intensificado" and print them
const lines = html.split('\n');
lines.forEach((line, index) => {
  if (line.includes('Ataque intensificado')) {
    console.log(`Line ${index + 1}: ${line.trim().slice(0, 300)}`);
  }
});
