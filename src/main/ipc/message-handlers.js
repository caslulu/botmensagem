const { ipcMain } = require('electron');
const {
  getMessages,
  addMessage,
  updateMessage,
  deleteMessage,
  selectMessage
} = require('../database');
const { formatMessageForRenderer } = require('../utils/message-formatter');
const { createSuccess } = require('../utils/result');

function registerMessageHandlers() {
  ipcMain.handle('messages:get', async (_event, profileId) => {
    try {
      const messages = getMessages(profileId);
      return messages.map(formatMessageForRenderer).filter(Boolean);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      throw error;
    }
  });

  ipcMain.handle('messages:add', async (_event, profileId, text, imagePath) => {
    try {
      const messageId = addMessage(profileId, text, imagePath);
      return createSuccess({ messageId });
    } catch (error) {
      console.error('Erro ao adicionar mensagem:', error);
      throw error;
    }
  });

  ipcMain.handle('messages:update', async (_event, messageId, text, imagePath) => {
    try {
  const success = updateMessage(messageId, text, imagePath);
  return createSuccess({ updated: success }, success);
    } catch (error) {
      console.error('Erro ao atualizar mensagem:', error);
      throw error;
    }
  });

  ipcMain.handle('messages:delete', async (_event, messageId) => {
    try {
  const success = deleteMessage(messageId);
  return createSuccess({ deleted: success }, success);
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error);
      throw error;
    }
  });

  ipcMain.handle('messages:select', async (_event, messageId) => {
    try {
  const success = selectMessage(messageId);
  return createSuccess({ selected: success }, success);
    } catch (error) {
      console.error('Erro ao selecionar mensagem:', error);
      throw error;
    }
  });
}

module.exports = { registerMessageHandlers };
