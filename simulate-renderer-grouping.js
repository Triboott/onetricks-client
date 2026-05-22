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

const scraper = new OnetricksScraper(null);

async function run() {
  await new Promise(r => setTimeout(r, 1000));
  const nextData = JSON.parse(fs.readFileSync('teemo_nextData.json', 'utf8'));
  const parsed = scraper.parseScrapedData('Teemo', { nextData, images: [] }, 'jungle');
  const data = scraper.resolveBuildDetails(parsed);

  const rawSets = data.runeSets || [data.runes];
  const keystonesMap = {};

  rawSets.forEach((set, originalIndex) => {
    const keystone = set.primaryPerks && set.primaryPerks[0];
    if (!keystone) return;
    
    const keystoneId = keystone.id;
    if (!keystonesMap[keystoneId]) {
      keystonesMap[keystoneId] = {
        id: keystoneId,
        name: keystone.name,
        icon: keystone.icon,
        playrateSum: 0,
        sets: []
      };
    }
    // Set the overall keystone playrate if available, otherwise sum set playrates
    if (set.keystonePlayrate !== undefined && set.keystonePlayrate !== null) {
      keystonesMap[keystoneId].playrateSum = set.keystonePlayrate;
    } else {
      keystonesMap[keystoneId].playrateSum += (set.playrate || 0);
    }
    keystonesMap[keystoneId].sets.push({
      set,
      originalIndex
    });
  });

  // Explicitly sort the sets within each keystone by their set.playrate descending
  Object.values(keystonesMap).forEach(group => {
    group.sets.sort((a, b) => (b.set.playrate || 0) - (a.set.playrate || 0));
  });

  const activeKeystonesList = Object.values(keystonesMap).sort((a, b) => b.playrateSum - a.playrateSum);

  console.log('--- keystonesMap and playrateSum ---');
  activeKeystonesList.forEach((k, idx) => {
    console.log(`Keystone Tab ${idx + 1}: ${k.name} (ID: ${k.id}) -> Playrate Sum = ${k.playrateSum.toFixed(1)}%`);
    k.sets.forEach((s, sIdx) => {
      console.log(`  Card ${sIdx + 1}: ${s.set.primaryStyleName} + ${s.set.subStyleName} -> Playrate: ${s.set.playrate}%`);
    });
  });
}

run().catch(console.error);
