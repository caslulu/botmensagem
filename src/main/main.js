const { app } = require('electron');

const automation = require('./automation');
const { initializeApp } = require('./bootstrap');
const { registerIpcHandlers } = require('./ipc');
const { forwardAutomationEvents } = require('./automation/events');
const windowManager = require('./window-manager');

const isDev = process.env.NODE_ENV === 'development';

app.on('ready', async () => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.caslulu.insurancehelper');
  }

  await initializeApp();

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

