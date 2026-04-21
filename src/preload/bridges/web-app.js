function registerWebAppBridge({ contextBridge, ipcRenderer }) {
  contextBridge.exposeInMainWorld('webApp', {
    open: () => ipcRenderer.invoke('app:open-web-app')
  });
}

module.exports = { registerWebAppBridge };
