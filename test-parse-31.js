const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');

const shardIds = [5001, 5002, 5003, 5005, 5007, 5008, 5010, 5011, 5012, 5013];
shardIds.forEach(id => {
  const count = (html.match(new RegExp(id.toString(), 'g')) || []).length;
  console.log(`Shard ID ${id}: found ${count} times`);
});
