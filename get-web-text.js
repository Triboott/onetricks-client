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
      const text = await tempWindow.webContents.executeJavaScript('document.body.innerText');
      console.log('--- VISIBLE WEB PAGE TEXT ---');
      console.log(text.substring(0, 3000));
    } catch (e) {
      console.error(e);
    }
    tempWindow.destroy();
    app.quit();
  });
}

test();
