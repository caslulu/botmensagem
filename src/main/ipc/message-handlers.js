const { ipcMain } = require('electron');
const messagesService = require('../domains/messages/messages-service');
const { createError } = require('../utils/result');

function registerMessageHandlers() {
  ipcMain.handle('messages:get', async (_event, profileId) => {
    try {
      return messagesService.listByProfile(profileId);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      return createError(error);
    }
  });

  ipcMain.handle('messages:add', async (_event, profileId, text, imagePath) => {
    try {
      return messagesService.create(profileId, text, imagePath);
    } catch (error) {
      console.error('Erro ao adicionar mensagem:', error);
      return createError(error);
    }
  });

  ipcMain.handle('messages:update', async (_event, messageId, text, imagePath) => {
    try {
      return messagesService.update(messageId, text, imagePath);
    } catch (error) {
      console.error('Erro ao atualizar mensagem:', error);
      return createError(error);
    }
  });

  ipcMain.handle('messages:delete', async (_event, messageId) => {
    try {
      return messagesService.remove(messageId);
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error);
      return createError(error);
    }
  });

  ipcMain.handle('messages:select', async (_event, messageId) => {
    try {
      return messagesService.select(messageId);
    } catch (error) {
      console.error('Erro ao selecionar mensagem:', error);
      return createError(error);
    }
  });
}

module.exports = { registerMessageHandlers };
