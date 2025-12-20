import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { setupAutoUpdater } from './updater';

class WindowManager {
  private mainWindow: BrowserWindow | null = null;

  getMainWindow(): BrowserWindow | null {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return null;
    }
    return this.mainWindow;
  }

  createMainWindow(options: { isDev?: boolean } = {}): BrowserWindow {
    const { isDev = false } = options;

    const existing = this.getMainWindow();
    if (existing) {
      return existing;
    }

    const logoCandidates = [
      path.join(__dirname, 'assets', 'logo-rounded.png'),
      path.join(__dirname, 'assets', 'logo.png'),
      path.join(__dirname, '..', '..', 'assets', 'images', 'logo.png'),
      path.join(__dirname, '..', '..', 'assets', 'images', 'profiles', 'logo.png'),
      path.join(process.cwd(), 'assets', 'images', 'logo.png'),
      path.join(process.cwd(), 'assets', 'images', 'profiles', 'logo.png')
    ];

    const logoPath = logoCandidates.find((candidate) => fs.existsSync(candidate));

    const bwOptions: BrowserWindowConstructorOptions = {
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

    const rendererUrl = process.env['ELECTRON_RENDERER_URL'];
    if (isDev && rendererUrl) {
      this.mainWindow.loadURL(rendererUrl);
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
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

  restoreOrCreateMainWindow(options: { isDev?: boolean } = {}): BrowserWindow {
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

const windowManager = new WindowManager();

export default windowManager;
