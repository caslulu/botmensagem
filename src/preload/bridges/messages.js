function registerMessagesBridge({ contextBridge, ipcRenderer }) {
  contextBridge.exposeInMainWorld('messages', {
    get: (profileId) => ipcRenderer.invoke('messages:get', profileId),
    add: (profileId, text, imagePath) => ipcRenderer.invoke('messages:add', profileId, text, imagePath),
    update: (messageId, text, imagePath) => ipcRenderer.invoke('messages:update', messageId, text, imagePath),
    delete: (messageId) => ipcRenderer.invoke('messages:delete', messageId),
    select: (messageId) => ipcRenderer.invoke('messages:select', messageId)
  });
}

module.exports = { registerMessagesBridge };