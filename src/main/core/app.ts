import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import automation from '../automation';
import { initializeApp } from '../bootstrap';
import { registerIpcHandlers } from '../ipc';
import { forwardAutomationEvents } from '../automation/events';
import windowManager from '../window-manager';

export function startMainProcess(): void {
  const isDev = process.env.NODE_ENV === 'development';

  app.on('ready', async () => {
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.caslulu.insurancehelper');
    }

    await initializeApp();

    const dockLogoCandidates = [
      path.join(__dirname, '..', 'assets', 'logo.png'),
      path.join(__dirname, '..', '..', 'assets', 'images', 'logo.png'),
      path.join(__dirname, '..', '..', 'assets', 'images', 'profiles', 'logo.png'),
      path.join(process.cwd(), 'assets', 'images', 'logo.png'),
      path.join(process.cwd(), 'assets', 'images', 'profiles', 'logo.png')
    ];

    const logoPath = dockLogoCandidates.find((candidate) => fs.existsSync(candidate));
    if (logoPath && process.platform === 'darwin' && app.dock) {
      try {
        const { generateRoundedIcon } = await import('../utils/icon-generator');
        const roundedOut = path.join(__dirname, '..', 'assets', 'logo-rounded.png');
        try {
          await generateRoundedIcon(logoPath, roundedOut, 512, 36).catch(() => null);
          const toUse = fs.existsSync(roundedOut) ? roundedOut : logoPath;
          app.dock.setIcon(toUse);
        } catch (err) {
          app.dock.setIcon(logoPath);
        }
      } catch {
        // Non-fatal: keep app running if setting dock icon fails
      }
    }

    windowManager.createMainWindow({ isDev });

    forwardAutomationEvents(automation, () => windowManager.getMainWindow());
    registerIpcHandlers(() => windowManager.getMainWindow());

    app.on('activate', () => {
      windowManager.restoreOrCreateMainWindow({ isDev });
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}