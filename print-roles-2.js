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
    await new Promise(r => setTimeout(r, 2000));
    try {
      const result = await tempWindow.webContents.executeJavaScript(`
        (function() {
          const links = Array.from(document.querySelectorAll('a')).map(a => ({
            href: a.href,
            text: a.textContent.trim(),
            html: a.innerHTML
          }));
          return links.filter(l => l.href.includes('veigar') || l.href.includes('role') || l.text.toLowerCase().includes('mid') || l.text.toLowerCase().includes('medio'));
        })()
      `);
      console.log('Filtered links:', JSON.stringify(result, null, 2));
    } catch (e) {
      console.error(e);
    }
    tempWindow.destroy();
    app.quit();
  });
}

test();
