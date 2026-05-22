const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.on('window-all-closed', () => {});

async function test() {
  await app.whenReady();
  
  const tempWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false,
    webPreferences: {
      offscreen: true,
      webSecurity: false
    }
  });

  tempWindow.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  tempWindow.loadURL('https://www.onetricks.gg/es/champions/builds/Ambessa?role=jungle');
  
  tempWindow.webContents.on('did-finish-load', async () => {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const nextData = await tempWindow.webContents.executeJavaScript(`
        (function() {
          const nextEl = document.getElementById('__NEXT_DATA__');
          if (nextEl) {
            return JSON.parse(nextEl.textContent);
          }
          return null;
        })()
      `);
      
      if (nextData) {
        fs.writeFileSync('ambessa_nextData.json', JSON.stringify(nextData, null, 2), 'utf8');
        console.log('Saved ambessa_nextData.json successfully!');
      } else {
        console.log('Could not find __NEXT_DATA__ on the page!');
      }
    } catch (e) {
      console.error(e);
    }
    tempWindow.destroy();
    app.quit();
  });
}

test();
