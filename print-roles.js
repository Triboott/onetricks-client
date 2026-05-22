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
      const html = await tempWindow.webContents.executeJavaScript(`
        document.body.innerHTML
      `);
      
      // Look for role links or buttons
      const matchRoleLinks = html.match(/href="[^"]*role=[^"]*"/g);
      console.log('Role links found by regex:', matchRoleLinks);
      
      const matchBuildsLinks = html.match(/href="[^"]*champions\/builds\/Veigar\/[^"]*"/g);
      console.log('Build path role links found by regex:', matchBuildsLinks);
    } catch (e) {
      console.error(e);
    }
    tempWindow.destroy();
    app.quit();
  });
}

test();
