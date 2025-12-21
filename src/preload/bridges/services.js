function registerServicesBridge({ contextBridge, ipcRenderer }) {
  contextBridge.exposeInMainWorld('services', {
    list: () => ipcRenderer.invoke('services:list')
  });
}

module.exports = { registerServicesBridge };