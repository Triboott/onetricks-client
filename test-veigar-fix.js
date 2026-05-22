const fs = require('fs');
const OnetricksScraper = require('./onetricks-scraper.js');

// Mock a minimal electron app structure to satisfy the constructor
const mockApp = {
  getPath: () => __dirname
};
const electronMock = require('electron');

async function test() {
  console.log('Loading OnetricksScraper...');
  const scraper = new OnetricksScraper(null);
  
  // Wait a moment for DDragon mock/fallback init if any (it runs async in background)
  await new Promise(r => setTimeout(r, 1000));
  
  // Read our cached next data
  const nextData = JSON.parse(fs.readFileSync('veigar_nextData.json', 'utf8'));
  
  console.log('Running parseScrapedData with offline Veigar nextData...');
  const parsed = scraper.parseScrapedData('Veigar', { nextData, images: [] }, 'mid');
  
  console.log('Parsed role:', parsed.role);
  
  if (parsed.runes) {
    const resolved = scraper.resolveBuildDetails(parsed);
    console.log('\n--- RESOLVED RUNE SETS ---');
    resolved.runeSets.forEach((set, idx) => {
      console.log(`Set ${idx + 1}:`);
      console.log(`  Keystone: ${set.primaryPerks[0]?.name} (ID: ${set.primaryPerks[0]?.id})`);
      console.log(`  Primary Tree: ${set.primaryStyleName} (ID: ${set.primaryStyleId}) [icon: ${set.primaryStyleIcon}]`);
      console.log(`  Secondary Tree: ${set.subStyleName} (ID: ${set.subStyleId}) [icon: ${set.subStyleIcon}]`);
      console.log(`  Playrate: ${set.playrate}%`);
      console.log(`  All Perks: [${set.raw.selectedPerkIds.join(', ')}]`);
      console.log(`  Shards:`, set.shardsPerks.map(s => `${s.name} (${s.id}) [icon: ${s.icon}]`).join(' | '));
    });
    
    console.log('\n--- RESOLVED ITEMS ---');
    console.log('Starting items:', resolved.items.startingBuild.map(i => `${i.name} (${i.id})`).join(', '));
    console.log('Boots:', resolved.items.popularBoots.map(i => `${i.name} (${i.id})`).join(', '));
    console.log('Core items:', resolved.items.coreItems.map(i => `${i.name} (${i.id})`).join(', '));
  } else {
    console.log('ERROR: No runes returned!');
  }
}

test().catch(console.error);
