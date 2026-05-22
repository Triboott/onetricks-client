const OnetricksScraper = require('./onetricks-scraper.js');
const { app } = require('electron');

app.on('window-all-closed', () => {});

async function test() {
  await app.whenReady();
  
  const tempWindow = new (require('electron').BrowserWindow)({
    width: 1280,
    height: 900,
    show: false,
    webPreferences: { offscreen: true }
  });
  
  tempWindow.loadURL('https://www.onetricks.gg/es/champions/builds/Veigar');
  
  tempWindow.webContents.on('did-finish-load', async () => {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const links = await tempWindow.webContents.executeJavaScript(`
        Array.from(document.querySelectorAll('a')).map(a => ({ href: a.href, text: a.textContent.trim() }))
      `);
      console.log('--- ALL LINKS ON PAGE ---');
      links.forEach(l => {
        if (l.href.includes('Veigar') || l.href.includes('veigar')) {
          console.log(`${l.text}: ${l.href}`);
        }
      });
    } catch (e) {
      console.error(e);
    }
    tempWindow.destroy();
    app.quit();
  });
}

test();
