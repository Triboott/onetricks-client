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
  
  tempWindow.loadURL('https://www.onetricks.gg/es/champions/builds/veigar');
  
  tempWindow.webContents.on('did-finish-load', async () => {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const html = await tempWindow.webContents.executeJavaScript(`
        (function() {
          const els = Array.from(document.querySelectorAll('div, h2, h3')).filter(el => el.textContent.includes('Veigar Runas'));
          return els.map(el => ({
            tagName: el.tagName,
            className: el.className,
            html: el.innerHTML.substring(0, 1000)
          }));
        })()
      `);
      console.log('Runes section element HTML:', JSON.stringify(html, null, 2));
    } catch (e) {
      console.error(e);
    }
    tempWindow.destroy();
    app.quit();
  });
}

test();
