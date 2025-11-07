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
  getSettings: (profileId) => ipcRenderer.invoke('profile:get-settings', profileId),
  updateSendLimit: (profileId, sendLimit) => ipcRenderer.invoke('profile:update-send-limit', profileId, sendLimit)
});
