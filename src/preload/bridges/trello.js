function registerTrelloBridge({ contextBridge, ipcRenderer }) {
  contextBridge.exposeInMainWorld('trello', {
    authCheck: () => ipcRenderer.invoke('trello:auth-check'),
    createCard: (data) => ipcRenderer.invoke('trello:create-card', data),
    decodeVin: (vin) => ipcRenderer.invoke('trello:decode-vin', vin),
    getListCards: (payload) => ipcRenderer.invoke('trello:get-list-cards', payload),
    deleteCard: (cardId) => ipcRenderer.invoke('trello:delete-card', cardId)
  });
}

module.exports = { registerTrelloBridge };
