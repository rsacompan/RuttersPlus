const { app, BrowserWindow, BrowserView } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: false
    }
  });

  const view = new BrowserView();
  win.setBrowserView(view);
  view.setBounds({ x: 0, y: 0, width: 900, height: 700 });
  view.webContents.loadURL('https://github.com');
}

app.whenReady().then(createWindow);