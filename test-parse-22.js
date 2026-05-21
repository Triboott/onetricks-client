const fs = require('fs');
const path = require('path');

const matches = JSON.parse(fs.readFileSync('match_history.json', 'utf8'));
const first = matches[0];

console.log('playerData keys/contents:', JSON.stringify(first.details.playerData, null, 2));
