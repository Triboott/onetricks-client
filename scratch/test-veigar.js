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
  
  // Read Veigar next data
  const nextData = JSON.parse(fs.readFileSync('veigar_nextData.json', 'utf8'));
  
  console.log('Parsing Veigar Next Data (Mid role)...');
  const parsed = scraper.parseScrapedData('Veigar', { nextData, images: [] }, 'mid');
  
  console.log('Parsed successfully!');
  const resolved = scraper.resolveBuildDetails(parsed);
  
  console.log('\n--- RESOLVED ITEMS ---');
  console.log('Starting Items:', resolved.items.startingBuild);
  console.log('Boots:', resolved.items.popularBoots);
  console.log('Core Build (coreItems):', resolved.items.coreItems);
  console.log('Recommended Items (recommendedItems):', resolved.items.recommendedItems);
}

test().catch(console.error);
