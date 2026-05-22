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
  
  tempWindow.loadURL('https://www.onetricks.gg/es/champions/builds/Veigar?role=mid');
  
  tempWindow.webContents.on('did-finish-load', async () => {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const url = tempWindow.webContents.getURL();
      const nextData = await tempWindow.webContents.executeJavaScript(`
        const el = document.getElementById('__NEXT_DATA__');
        el ? JSON.parse(el.textContent) : null;
      `);
      console.log('Real URL after loading ?role=mid:', url);
      if (nextData && nextData.props && nextData.props.pageProps) {
        const pp = nextData.props.pageProps;
        console.log('pp.role:', pp.role);
        console.log('pp.popRole:', pp.popRole);
        console.log('pp.filters.role:', pp.filters && pp.filters.role);
        console.log('firstItemStats patch:', Object.keys(pp.firstItemStats || {})[0]);
        const pKey = Object.keys(pp.firstItemStats || {})[0];
        if (pp.firstItemStats && pp.firstItemStats[pKey]) {
          console.log('popTree keys under patch:', Object.keys(pp.firstItemStats[pKey]));
          if (pp.firstItemStats[pKey].all) {
            console.log('all.popTree first 3:', pp.firstItemStats[pKey].all.popTree.slice(0, 3));
          }
        }
      } else {
        console.log('No nextData props found!');
      }
    } catch (e) {
      console.error(e);
    }
    tempWindow.destroy();
    app.quit();
  });
}

test();
