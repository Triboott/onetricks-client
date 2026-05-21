const fs = require('fs');
const path = require('path');
const Module = require('module');

// Mock electron before requiring the scraper
const mockElectron = {
  app: {
    getPath: (name) => {
      if (name === 'userData') {
        const p = path.join(__dirname, '../temp_userdata');
        if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
        return p;
      }
      return __dirname;
    }
  },
  BrowserWindow: class MockBrowserWindow {}
};

// Inject into require cache
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'electron') {
    return mockElectron;
  }
  return originalRequire.apply(this, arguments);
};

const OnetricksScraper = require('../onetricks-scraper.js');

// Mock mainWindow
const mockMainWindow = {
  webContents: {
    send: () => {}
  }
};

const scraper = new OnetricksScraper(mockMainWindow);

setTimeout(() => {
  try {
    const nextData = JSON.parse(fs.readFileSync(path.join(__dirname, '../next_data_debug.json'), 'utf8'));
    const scrapingResult = {
      nextData,
      images: [],
      tooltips: [],
      title: 'Teemo Builds',
      html: ''
    };

    console.log('Testing default role parse...');
    const resultDefault = scraper.parseScrapedData('Teemo', scrapingResult, 'default');
    console.log('Parsed Default:', JSON.stringify(resultDefault.runes.selectedPerkIds));

    console.log('\nTesting TOP role parse...');
    const resultTop = scraper.parseScrapedData('Teemo', scrapingResult, 'TOP');
    console.log('Parsed TOP:', JSON.stringify(resultTop.runes.selectedPerkIds));

    console.log('\nTesting JUNGLE role parse (which should fallback to ALL since Teemo has no JUNGLE key in stats)...');
    const resultJungle = scraper.parseScrapedData('Teemo', scrapingResult, 'JUNGLE');
    console.log('Parsed JUNGLE:', JSON.stringify(resultJungle.runes.selectedPerkIds));

    // Cleanup temp userdata folder
    const tempDir = path.join(__dirname, '../temp_userdata');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    process.exit(0);
  } catch (err) {
    console.error('Error during testing:', err);
    process.exit(1);
  }
}, 1500);
