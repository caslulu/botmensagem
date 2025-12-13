const { ipcMain } = require('electron');
const priceService = require('../price/services/priceService');
const quotesRepository = require('../price/repositories/quotesRepository');
const { createSuccess, createError } = require('../utils/result');

function registerPriceHandlers() {
  ipcMain.handle('price:list-quotes', async () => {
    try {
      return createSuccess({ quotes: priceService.getQuotes() });
    } catch (error) {
      return createError(error);
    }
  });

  ipcMain.handle('price:get-quote', async (_event, id) => {
    try {
      const quote = quotesRepository.get(String(id || ''));
      return createSuccess({ quote });
    } catch (error) {
      return createError(error);
    }
  });

  ipcMain.handle('price:delete-quote', async (_event, id) => {
    try {
      const ok = quotesRepository.delete(String(id || ''));
      return createSuccess({ deleted: Boolean(ok) });
    } catch (error) {
      return createError(error);
    }
  });

  ipcMain.handle('price:upsert-quote', async (_event, entry) => {
    try {
      const saved = quotesRepository.upsert(entry || {});
      return createSuccess({ quote: saved });
    } catch (error) {
      return createError(error);
    }
  });

  ipcMain.handle('price:generate', async (_event, payload) => {
    try {
      const result = await priceService.generate(payload || {});
      return createSuccess({ result });
    } catch (error) {
      console.error('Erro ao gerar preço automático:', error);
      return createError(error);
    }
  });
}

module.exports = { registerPriceHandlers };
