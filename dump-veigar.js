const OnetricksScraper = require('./onetricks-scraper.js');
const { app } = require('electron');
const fs = require('fs');

app.on('window-all-closed', () => {});

async function test() {
  await app.whenReady();
  const scraper = new OnetricksScraper(null);
  
  await new Promise(r => setTimeout(r, 2000));
  
  try {
    const scraped = await scraper.scrapeRunesAndSummoners('Veigar', 'mid');
    console.log("Veigar mid scraped successfully.");
  } catch (e) {
    console.error(e);
  }
  
  app.quit();
}

test();
