const { ipcMain } = require('electron');
const { listServices } = require('../services/service-registry');

function registerServiceHandlers() {
  ipcMain.handle('services:list', async () => listServices());
}

module.exports = { registerServiceHandlers };
