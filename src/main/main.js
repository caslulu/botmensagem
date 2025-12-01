import { app } from 'electron';
import automation from './automation';
import * as bootstrap from './bootstrap';
import * as ipc from './ipc';
import * as automationEvents from './automation/events';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const windowManager = require('./window-manager');

const { initializeApp } = bootstrap;
const { registerIpcHandlers } = ipc;
const { forwardAutomationEvents } = automationEvents;

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

