const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');

const shardIds = [5001, 5002, 5003, 5005, 5007, 5008, 5010, 5011, 5012, 5013];
shardIds.forEach(id => {
  let pos = 0;
  let index;
  let count = 0;
  while ((index = html.indexOf(id.toString(), pos)) !== -1 && count < 5) {
    count++;
    pos = index + 1;
    const start = Math.max(0, index - 100);
    const end = Math.min(html.length, index + 100);
    console.log(`\nShard ${id} occurrence ${count}:`);
    console.log(html.slice(start, end).replace(/\n/g, ' '));
  }
});
