function registerPriceBridge({ contextBridge, ipcRenderer }) {
  contextBridge.exposeInMainWorld('price', {
    generate: (payload) => ipcRenderer.invoke('price:generate', payload)
  });
}

module.exports = { registerPriceBridge };
