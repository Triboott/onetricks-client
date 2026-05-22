const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(async () => {
  console.log('Starting offscreen SVG rendering...');

  const svgPath = path.join(__dirname, 'tray_icon.svg');
  if (!fs.existsSync(svgPath)) {
    console.error('Error: tray_icon.svg not found!');
    app.quit();
    return;
  }
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  const svgDataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgContent);

  // 1. Render Tray Icon (32x32)
  const winTray = new BrowserWindow({
    width: 32,
    height: 32,
    show: false,
    transparent: true,
    frame: false,
    webPreferences: {
      offscreen: true
    }
  });
  
  await winTray.loadURL(svgDataUrl);
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const imgTray = await winTray.webContents.capturePage();
  fs.writeFileSync(path.join(__dirname, 'tray_icon.png'), imgTray.toPNG());
  console.log('Generated transparent tray_icon.png (32x32) successfully!');
  winTray.close();

  // 2. Render App Icon (256x256)
  const winApp = new BrowserWindow({
    width: 256,
    height: 256,
    show: false,
    transparent: true,
    frame: false,
    webPreferences: {
      offscreen: true
    }
  });
  
  await winApp.loadURL(svgDataUrl);
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const imgApp = await winApp.webContents.capturePage();
  fs.writeFileSync(path.join(__dirname, 'app_icon.png'), imgApp.toPNG());
  console.log('Generated transparent app_icon.png (256x256) successfully!');
  winApp.close();

  console.log('Icon rendering complete. Exiting.');
  app.quit();
});
