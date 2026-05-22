const fs = require('fs');
const path = require('path');

// Mock Electron so we can load the scraper without Electron runtime errors
const mockApp = {
  getPath: () => path.join(__dirname, '..')
};
require.cache[require.resolve('electron')] = {
  exports: {
    app: mockApp,
    BrowserWindow: class {}
  }
};

const OnetricksScraper = require('../onetricks-scraper.js');

async function test() {
  console.log('Initializing OnetricksScraper...');
  const scraper = new OnetricksScraper(null);
  
  // Wait a second for DDragon fallback init
  await new Promise(r => setTimeout(r, 1000));
  
  // Read Ambessa next data
  const nextData = JSON.parse(fs.readFileSync('ambessa_nextData.json', 'utf8'));
  
  console.log('Parsing Ambessa Next Data (Jungle role)...');
  const parsed = scraper.parseScrapedData('Ambessa', { nextData, images: [] }, 'jungle');
  
  console.log('Parsed successfully!');
  const resolved = scraper.resolveBuildDetails(parsed);
  
  console.log('\n--- RESOLVED RUNES ---');
  resolved.runeSets.forEach((set, i) => {
    console.log(`\nSet ${i + 1}:`);
    console.log(`  Primary Tree: ${set.primaryStyleName} (${set.primaryStyleId})`);
    console.log(`  Secondary Tree: ${set.subStyleName} (${set.subStyleId})`);
    console.log(`  Playrate: ${set.playrate}%`);
    console.log(`  Primary perks:`, set.primaryPerks.map(p => `${p.name} (${p.id})`));
    console.log(`  Secondary perks:`, set.secondaryPerks.map(p => `${p.name} (${p.id})`));
    console.log(`  Shards:`, set.shardsPerks.map(p => `${p.name} (${p.id})`));
  });

  console.log('\n--- RESOLVED ITEMS ---');
  console.log('Starting Items:', resolved.items.startingBuild);
  console.log('Boots:', resolved.items.popularBoots);
  console.log('Core Build (coreItems):', resolved.items.coreItems);
  console.log('Recommended Items (recommendedItems):', resolved.items.recommendedItems);
}

test().catch(console.error);
