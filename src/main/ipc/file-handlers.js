const { ipcMain, app, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const { createSuccess, createError } = require('../utils/result');

function registerFileHandlers(getMainWindow) {
  ipcMain.handle('file:save-to-downloads', async (_event, srcPath, suggestedName) => {
    try {
      if (!srcPath || !fs.existsSync(srcPath)) {
        throw new Error('Arquivo origem inexistente');
      }

      const downloads = app.getPath('downloads');
      const baseName = suggestedName || path.basename(srcPath);
      let target = path.join(downloads, baseName);

      if (fs.existsSync(target)) {
        const parsed = path.parse(baseName);
        let i = 1;
        while (fs.existsSync(target)) {
          target = path.join(downloads, `${parsed.name}(${i})${parsed.ext}`);
          i += 1;
        }
      }

      fs.copyFileSync(srcPath, target);
      return createSuccess({ path: target });
    } catch (error) {
      return createError(error);
    }
  });

  ipcMain.handle('file:show-in-folder', async (_event, targetPath) => {
    try {
      if (targetPath && fs.existsSync(targetPath)) {
        shell.showItemInFolder(targetPath);
        return createSuccess();
      }
      throw new Error('Caminho inválido');
    } catch (error) {
      return createError(error);
    }
  });

  ipcMain.handle('file:open-path', async (_event, targetPath) => {
    try {
      if (targetPath && fs.existsSync(targetPath)) {
        const res = await shell.openPath(targetPath);
        if (res) throw new Error(res);
        return createSuccess();
      }
      throw new Error('Caminho inválido');
    } catch (error) {
      return createError(error);
    }
  });

  ipcMain.handle('file:select-image', async () => {
    try {
      const mainWindow = getMainWindow?.();
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
          { name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] }
        ],
        title: 'Selecione uma imagem'
      });

      if (result.canceled || result.filePaths.length === 0) {
        return createError('Operação cancelada pelo usuário', { path: null });
      }

      return createSuccess({ path: result.filePaths[0] });
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      throw error;
    }
  });
}

module.exports = { registerFileHandlers };
