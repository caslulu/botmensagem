const { ipcMain } = require('electron');
const rtaService = require('../rta/services/rtaService');
const { createSuccess, createError } = require('../utils/result');

function registerRtaHandlers() {
  ipcMain.handle('rta:generate', async (_event, data) => {
    try {
      const output = await rtaService.preencherRtaAndSave(data || {});
      return createSuccess({ output });
    } catch (error) {
      console.error('Erro no RTA:', error);
      return createError(error);
    }
  });
}

module.exports = { registerRtaHandlers };
