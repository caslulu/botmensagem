const { ipcMain } = require('electron');
const trelloService = require('../trello/services/trelloService');
const quotesRepository = require('../price/repositories/quotesRepository');
const { createSuccess, createError } = require('../utils/result');

function registerTrelloHandlers() {
  ipcMain.handle('trello:auth-check', async () => {
    try {
      const ok = await trelloService.trelloAuthCheck();
      if (!ok) {
        return createError('Não autenticado', { authenticated: false });
      }
      return createSuccess({ authenticated: true });
    } catch (error) {
      return createError(error, { authenticated: false });
    }
  });

  ipcMain.handle('trello:create-card', async (_event, data) => {
    try {
      const card = await trelloService.createTrelloCard(data || {});
      try {
        quotesRepository.saveFromTrello(data || {}, card);
      } catch (repoError) {
        console.warn('Falha ao salvar cotação no banco de dados:', repoError.message);
      }
      return createSuccess({ card });
    } catch (error) {
      return createError(error);
    }
  });
}

module.exports = { registerTrelloHandlers };
