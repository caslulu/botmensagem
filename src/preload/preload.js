const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('automation', {
  getProfiles: () => ipcRenderer.invoke('automation:profiles'),
  start: (profileId) => ipcRenderer.invoke('automation:start', profileId),
  stop: () => ipcRenderer.invoke('automation:stop'),
  onLog: (callback) => ipcRenderer.on('automation:log', (_, payload) => callback(payload)),
  removeLogListener: () => ipcRenderer.removeAllListeners('automation:log'),
  onStatus: (callback) => ipcRenderer.on('automation:status', (_, payload) => callback(payload)),
  removeStatusListener: () => ipcRenderer.removeAllListeners('automation:status')
});

contextBridge.exposeInMainWorld('messages', {
  get: (profileId) => ipcRenderer.invoke('messages:get', profileId),
  add: (profileId, text, imagePath) => ipcRenderer.invoke('messages:add', profileId, text, imagePath),
  update: (messageId, text, imagePath) => ipcRenderer.invoke('messages:update', messageId, text, imagePath),
  delete: (messageId) => ipcRenderer.invoke('messages:delete', messageId),
  select: (messageId) => ipcRenderer.invoke('messages:select', messageId)
});

contextBridge.exposeInMainWorld('fileSystem', {
  selectImage: () => ipcRenderer.invoke('file:select-image')
});

contextBridge.exposeInMainWorld('profile', {
  create: (profile) => ipcRenderer.invoke('profile:create', profile),
  getSettings: (profileId) => ipcRenderer.invoke('profile:get-settings', profileId),
  updateSendLimit: (profileId, sendLimit) => ipcRenderer.invoke('profile:update-send-limit', profileId, sendLimit)
});

// Serviços gerais e RTA (migrados do Python)
contextBridge.exposeInMainWorld('services', {
  list: () => ipcRenderer.invoke('services:list')
});

contextBridge.exposeInMainWorld('rta', {
  generate: (data) => ipcRenderer.invoke('rta:generate', data)
});

contextBridge.exposeInMainWorld('trello', {
  authCheck: () => ipcRenderer.invoke('trello:auth-check'),
  createCard: (data) => ipcRenderer.invoke('trello:create-card', data)
});

contextBridge.exposeInMainWorld('price', {
  listQuotes: () => ipcRenderer.invoke('price:list-quotes'),
  getQuote: (id) => ipcRenderer.invoke('price:get-quote', id),
  deleteQuote: (id) => ipcRenderer.invoke('price:delete-quote', id),
  upsertQuote: (entry) => ipcRenderer.invoke('price:upsert-quote', entry),
  generate: (payload) => ipcRenderer.invoke('price:generate', payload)
});

contextBridge.exposeInMainWorld('quotes', {
  runAutomation: (payload) => ipcRenderer.invoke('quotes:run-automation', payload)
});

// Arquivos (salvar/abrir)
contextBridge.exposeInMainWorld('files', {
  saveToDownloads: (srcPath, suggestedName) => ipcRenderer.invoke('file:save-to-downloads', srcPath, suggestedName),
  showInFolder: (targetPath) => ipcRenderer.invoke('file:show-in-folder', targetPath),
  openPath: (targetPath) => ipcRenderer.invoke('file:open-path', targetPath)
});
