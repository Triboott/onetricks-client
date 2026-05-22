const fs = require('fs');
const path = require('path');

// Mock Electron so we can load the scraper without Electron runtime errors
const mockApp = {
  getPath: () => __dirname
};
require.cache[require.resolve('electron')] = {
  exports: {
    app: mockApp,
    BrowserWindow: class {}
  }
};

const OnetricksScraper = require('./onetricks-scraper.js');

async function test() {
  console.log('Initializing OnetricksScraper...');
  const scraper = new OnetricksScraper(null);
  
  // Wait a second for DDragon fallback init
  await new Promise(r => setTimeout(r, 1000));
  
  // Read Teemo next data
  const nextData = JSON.parse(fs.readFileSync('teemo_nextData.json', 'utf8'));
  
  console.log('Parsing Teemo Next Data (Jungle role)...');
  const parsed = scraper.parseScrapedData('Teemo', { nextData, images: [] }, 'jungle');
  
  console.log('Parsed successfully!');
  const resolved = scraper.resolveBuildDetails(parsed);
  
  console.log('\n--- RESOLVED RUNE SETS ---');
  resolved.runeSets.forEach((set, idx) => {
    console.log(`Set ${idx + 1}:`);
    console.log(`  Keystone: ${set.primaryPerks[0]?.name} (ID: ${set.primaryPerks[0]?.id})`);
    console.log(`  Primary Tree: ${set.primaryStyleName} (ID: ${set.primaryStyleId})`);
    console.log(`  Secondary Tree: ${set.subStyleName} (ID: ${set.subStyleId})`);
    console.log(`  Playrate: ${set.playrate}%`);
  });
}

test().catch(console.error);
