function registerAutomationBridge({ contextBridge, ipcRenderer }) {
  contextBridge.exposeInMainWorld('automation', {
    getProfiles: () => ipcRenderer.invoke('automation:profiles'),
    start: (profileId) => ipcRenderer.invoke('automation:start', profileId),
    stop: () => ipcRenderer.invoke('automation:stop'),
    onLog: (callback) => ipcRenderer.on('automation:log', (_, payload) => callback(payload)),
    removeLogListener: () => ipcRenderer.removeAllListeners('automation:log'),
    onStatus: (callback) => ipcRenderer.on('automation:status', (_, payload) => callback(payload)),
    removeStatusListener: () => ipcRenderer.removeAllListeners('automation:status')
  });
}

module.exports = { registerAutomationBridge };