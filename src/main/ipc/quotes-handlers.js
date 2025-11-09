const { ipcMain } = require('electron');
const { createSuccess, createError } = require('../utils/result');
const quoteAutomation = require('../automation/quotes');

function registerQuoteHandlers() {
  ipcMain.handle('quotes:run-automation', async (_event, payload) => {
    try {
      const result = await quoteAutomation.runAutomation(payload || {});
      return createSuccess({ result });
    } catch (error) {
      console.error('[IPC][quotes:run-automation]', error);
      return createError(error);
    }
  });
}

module.exports = { registerQuoteHandlers };
