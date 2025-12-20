const { BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const { setupAutoUpdater } = require('./updater');

// Garante instância única da janela principal (Singleton simples).
class WindowManager {
  constructor() {
    this.mainWindow = null;
  }

  getMainWindow() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return null;
    }
    return this.mainWindow;
  }

  createMainWindow(options = {}) {
    const { isDev = false } = options;

    if (this.getMainWindow()) {
      return this.mainWindow;
    }

    const logoCandidates = [
      path.join(__dirname, 'assets', 'logo-rounded.png'),
      path.join(__dirname, 'assets', 'logo.png'),
      path.join(__dirname, '..', '..', 'assets', 'images', 'logo.png'),
      path.join(__dirname, '..', '..', 'assets', 'images', 'profiles', 'logo.png'),
      path.join(process.cwd(), 'assets', 'images', 'logo.png'),
      path.join(process.cwd(), 'assets', 'images', 'profiles', 'logo.png')
    ];

    const logoPath = logoCandidates.find(p => fs.existsSync(p));

    const bwOptions = {
      width: 1200,
      height: 800,
      minWidth: 960,
      minHeight: 640,
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    };

    if (logoPath) {
      bwOptions.icon = logoPath;
    }

    this.mainWindow = new BrowserWindow(bwOptions);

    // HMR for renderer base on electron-vite CLI.
    // Load the remote URL for development or the local html file for production.
    if (isDev && process.env['ELECTRON_RENDERER_URL']) {
      this.mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
    }

    if (isDev) {
      this.mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
      setupAutoUpdater(this.mainWindow);
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
  }

  restoreOrCreateMainWindow(options = {}) {
    const window = this.getMainWindow();
    if (window) {
      if (window.isMinimized()) {
        window.restore();
      }
      window.focus();
      return window;
    }

    return this.createMainWindow(options);
  }
}

module.exports = new WindowManager();
