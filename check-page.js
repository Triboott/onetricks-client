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
      const url = tempWindow.webContents.getURL();
      const title = await tempWindow.webContents.executeJavaScript('document.title');
      const bodyLength = await tempWindow.webContents.executeJavaScript('document.body.innerText.length');
      const nextDataText = await tempWindow.webContents.executeJavaScript(`
        const el = document.getElementById('__NEXT_DATA__');
        el ? el.textContent.substring(0, 300) : 'NO __NEXT_DATA__';
      `);
      console.log('Real URL:', url);
      console.log('Title:', title);
      console.log('Body length:', bodyLength);
      console.log('__NEXT_DATA__ snippet:', nextDataText);
    } catch (e) {
      console.error(e);
    }
    tempWindow.destroy();
    app.quit();
  });
}

test();
