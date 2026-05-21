function registerQuotesBridge({ contextBridge, ipcRenderer }) {
  contextBridge.exposeInMainWorld('quotes', {
    runAutomation: (payload) => ipcRenderer.invoke('quotes:run-automation', payload)
  });
}

module.exports = { registerQuotesBridge };