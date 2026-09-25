const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const PORT = 3210;
const HOST = '127.0.0.1';
let mainWindow;

function startServer() {
  process.env.PORT = String(PORT);
  process.env.KAWADER_DATA_DIR = app.getPath('userData');
  require(path.join(__dirname, 'server.js'));
}

async function waitForServer(timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const r = await fetch(`http://${HOST}:${PORT}/`);
      if (r.ok) return true;
    } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return false;
}

async function createWindow() {
  if (!await waitForServer()) {
    app.quit();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, 'public', 'logo.ico'),
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://${HOST}:${PORT}`)) shell.openExternal(url);
    return { action: 'deny' };
  });

  await mainWindow.loadURL(`http://${HOST}:${PORT}/`);
}

app.whenReady().then(async () => {
  startServer();
  await createWindow();
});

app.on('window-all-closed', () => app.quit());
