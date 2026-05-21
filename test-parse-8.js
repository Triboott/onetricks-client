const fs = require('fs');
const path = require('path');

const matches = JSON.parse(fs.readFileSync('match_history.json', 'utf8'));
const first = matches[0];

console.log('first.p["0"] keys:', Object.keys(first.p["0"] || {}));
console.log('first.p["0"] content:', JSON.stringify(first.p["0"], null, 2));

console.log('first.tbl["0"] content:', JSON.stringify(first.tbl["0"], null, 2));
