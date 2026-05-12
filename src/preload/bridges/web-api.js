function registerWebApiBridge({ contextBridge, ipcRenderer }) {
  contextBridge.exposeInMainWorld('desktopWebApi', {
    request: (payload) => ipcRenderer.invoke('web-api:request', payload)
  });
}

module.exports = { registerWebApiBridge };
