const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const automation = require('../automation');
const { initializeApp } = require('../bootstrap');
const { registerIpcHandlers } = require('../ipc');
const { forwardAutomationEvents } = require('../automation/events');
const windowManager = require('../window-manager');

function startMainProcess() {
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

    const logoPath = dockLogoCandidates.find(p => fs.existsSync(p));
    if (logoPath && process.platform === 'darwin' && app.dock) {
      try {
        // attempt to generate a slightly rounded variant to match system icons
        const { generateRoundedIcon } = require('../utils/icon-generator');
        const roundedOut = path.join(__dirname, '..', 'assets', 'logo-rounded.png');
        try {
          // generate rounded icon (best-effort, non-blocking on failure)
          await generateRoundedIcon(logoPath, roundedOut, 512, 36).catch(() => null);
          const toUse = fs.existsSync(roundedOut) ? roundedOut : logoPath;
          app.dock.setIcon(toUse);
        } catch (err) {
          app.dock.setIcon(logoPath);
        }
      } catch (err) {
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

module.exports = { startMainProcess };