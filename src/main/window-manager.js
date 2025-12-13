const { BrowserWindow } = require('electron');
const path = require('path');

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

    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 960,
      minHeight: 640,
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        sandbox: false
      }
    });

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
