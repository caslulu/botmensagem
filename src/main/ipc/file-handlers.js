const { ipcMain } = require('electron');
const fileService = require('../domains/files/files-service');

function registerFileHandlers(getMainWindow) {
  ipcMain.handle('file:save-to-downloads', async (_event, srcPath, suggestedName) => {
    try {
      return fileService.saveToDownloads(srcPath, suggestedName);
    } catch (error) {
      console.error('Erro ao salvar em downloads:', error);
      return fileService.saveToDownloads(srcPath, suggestedName);
    }
  });

  ipcMain.handle('file:show-in-folder', async (_event, targetPath) => {
    try {
      return fileService.showInFolder(targetPath);
    } catch (error) {
      console.error('Erro ao abrir pasta:', error);
      return fileService.showInFolder(targetPath);
    }
  });

  ipcMain.handle('file:open-path', async (_event, targetPath) => {
    try {
      return await fileService.openPath(targetPath);
    } catch (error) {
      console.error('Erro ao abrir caminho:', error);
      return await fileService.openPath(targetPath);
    }
  });

  ipcMain.handle('file:select-image', async () => {
    try {
      return await fileService.selectImage(getMainWindow);
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      throw error;
    }
  });
}

module.exports = { registerFileHandlers };
