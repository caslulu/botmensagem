const { app, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { createSuccess, createError } = require('../../utils/result');

function saveToDownloads(srcPath, suggestedName) {
  if (!srcPath || !fs.existsSync(srcPath)) {
    return createError('Arquivo origem inexistente');
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
}

function showInFolder(targetPath) {
  if (targetPath && fs.existsSync(targetPath)) {
    shell.showItemInFolder(targetPath);
    return createSuccess();
  }
  return createError('Caminho inválido');
}

async function openPath(targetPath) {
  if (targetPath && fs.existsSync(targetPath)) {
    const res = await shell.openPath(targetPath);
    if (res) return createError(res);
    return createSuccess();
  }
  return createError('Caminho inválido');
}

async function selectImage(getMainWindow) {
  const mainWindow = getMainWindow?.();
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] }],
    title: 'Selecione uma imagem'
  });

  if (result.canceled || result.filePaths.length === 0) {
    return createError('Operação cancelada pelo usuário', { path: null });
  }

  return createSuccess({ path: result.filePaths[0] });
}

module.exports = {
  saveToDownloads,
  showInFolder,
  openPath,
  selectImage
};
