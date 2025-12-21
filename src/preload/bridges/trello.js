function registerTrelloBridge({ contextBridge, ipcRenderer }) {
  contextBridge.exposeInMainWorld('trello', {
    authCheck: () => ipcRenderer.invoke('trello:auth-check'),
    createCard: (data) => ipcRenderer.invoke('trello:create-card', data),
    decodeVin: (vin) => ipcRenderer.invoke('trello:decode-vin', vin)
  });
}

module.exports = { registerTrelloBridge };