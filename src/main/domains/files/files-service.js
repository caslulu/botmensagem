const { app, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');
const { createSuccess, createError } = require('../../utils/result');

const imageMimeTypes = new Map([
  ['.avif', 'image/avif'],
  ['.bmp', 'image/bmp'],
  ['.gif', 'image/gif'],
  ['.heic', 'image/heic'],
  ['.heif', 'image/heif'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp']
]);

function normalizeLocalPath(targetPath) {
  const value = String(targetPath || '').trim();
  if (!value) return '';
  if (/^file:\/\//i.test(value)) {
    return fileURLToPath(value);
  }
  return value;
}

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
  const normalizedPath = normalizeLocalPath(targetPath);
  if (normalizedPath && fs.existsSync(normalizedPath)) {
    const res = await shell.openPath(normalizedPath);
    if (res) return createError(res);
    return createSuccess();
  }
  return createError('Caminho inválido');
}

function readImageAsDataUrl(targetPath) {
  const normalizedPath = normalizeLocalPath(targetPath);
  if (!normalizedPath || !fs.existsSync(normalizedPath)) {
    return createError('Imagem não encontrada.');
  }

  const ext = path.extname(normalizedPath).toLowerCase();
  const mimeType = imageMimeTypes.get(ext);
  if (!mimeType) {
    return createError('Formato de imagem não suportado.');
  }

  const buffer = fs.readFileSync(normalizedPath);
  return createSuccess({
    dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`
  });
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

async function selectImages(getMainWindow) {
  const mainWindow = getMainWindow?.();
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] }],
    title: 'Selecione uma ou mais imagens'
  });

  if (result.canceled || result.filePaths.length === 0) {
    return createError('Operação cancelada pelo usuário', { paths: null });
  }

  return createSuccess({ paths: result.filePaths });
}

module.exports = {
  saveToDownloads,
  showInFolder,
  openPath,
  readImageAsDataUrl,
  selectImage,
  selectImages
};
