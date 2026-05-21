const fs = require('fs');
const path = require('path');
const os = require('os');

const cacheDir = path.join(os.homedir(), 'AppData/Roaming/onetricks-client/ddragon_cache');
console.log('Cache directory path:', cacheDir);
if (fs.existsSync(cacheDir)) {
  console.log('Cache directory exists.');
  const files = fs.readdirSync(cacheDir);
  console.log('Files in cache:', files);
  files.forEach(f => {
    const stats = fs.statSync(path.join(cacheDir, f));
    console.log(` - ${f}: ${stats.size} bytes`);
  });
} else {
  console.log('Cache directory does NOT exist.');
}
