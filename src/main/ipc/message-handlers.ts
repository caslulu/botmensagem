import { ipcMain } from 'electron';
import messagesService from '../domains/messages/messages-service';
import { createError } from '../utils/result';

export function registerMessageHandlers(): void {
  ipcMain.handle('messages:get', async (_event, profileId: string) => {
    try {
      return messagesService.listByProfile(profileId);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      return createError(error);
    }
  });

  ipcMain.handle('messages:add', async (_event, profileId: string, text: string, imagePath?: string | null) => {
    try {
      return messagesService.create(profileId, text, imagePath);
    } catch (error) {
      console.error('Erro ao adicionar mensagem:', error);
      return createError(error);
    }
  });

  ipcMain.handle('messages:update', async (_event, messageId: string, text: string, imagePath?: string | null) => {
    try {
      return messagesService.update(Number(messageId), text, imagePath);
    } catch (error) {
      console.error('Erro ao atualizar mensagem:', error);
      return createError(error);
    }
  });

  ipcMain.handle('messages:delete', async (_event, messageId: string) => {
    try {
      return messagesService.remove(Number(messageId));
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error);
      return createError(error);
    }
  });

  ipcMain.handle('messages:select', async (_event, messageId: string) => {
    try {
      return messagesService.select(Number(messageId));
    } catch (error) {
      console.error('Erro ao selecionar mensagem:', error);
      return createError(error);
    }
  });
}
