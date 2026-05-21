const fs = require('fs');
const path = require('path');

const matches = JSON.parse(fs.readFileSync('match_history.json', 'utf8'));
const first = matches[0];

console.log('first.details keys:', Object.keys(first.details || {}));
console.log('first.tbl keys:', Object.keys(first.tbl || {}));
console.log('first.timeline keys:', Object.keys(first.timeline || {}));
console.log('first.p keys:', Object.keys(first.p || {}));

console.log('first.p.runes:', first.p.runes);
console.log('first.p.spells:', first.p.spells);
console.log('first.p.items:', first.p.items);
console.log('first.p.keystone:', first.p.keystone);
