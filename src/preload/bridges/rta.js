function registerRtaBridge({ contextBridge, ipcRenderer }) {
  contextBridge.exposeInMainWorld('rta', {
    generate: (data) => ipcRenderer.invoke('rta:generate', data)
  });
}

module.exports = { registerRtaBridge };