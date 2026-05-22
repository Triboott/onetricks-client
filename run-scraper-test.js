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
  
  console.log('\n--- RESOLVED ITEMS ---');
  console.log('Starting Items:', resolved.items.startingBuild);
  console.log('Boots:', resolved.items.popularBoots);
  console.log('Core Build:', resolved.items.coreBuild);
  console.log('Recommended Items:', resolved.items.recommendedItems);
  console.log('Summoner Options:', resolved.summonersOptions);
}

test().catch(console.error);
