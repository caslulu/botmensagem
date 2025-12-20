function registerPriceBridge({ contextBridge, ipcRenderer }) {
  contextBridge.exposeInMainWorld('price', {
    listQuotes: () => ipcRenderer.invoke('price:list-quotes'),
    getQuote: (id) => ipcRenderer.invoke('price:get-quote', id),
    deleteQuote: (id) => ipcRenderer.invoke('price:delete-quote', id),
    upsertQuote: (entry) => ipcRenderer.invoke('price:upsert-quote', entry),
    generate: (payload) => ipcRenderer.invoke('price:generate', payload)
  });
}

module.exports = { registerPriceBridge };