function registerSchedulerBridge({ contextBridge, ipcRenderer }) {
  contextBridge.exposeInMainWorld('schedulerApi', {
    health: () => ipcRenderer.invoke('scheduler:health'),
    getStatus: () => ipcRenderer.invoke('scheduler:status'),
    getConfig: () => ipcRenderer.invoke('scheduler:get-config'),
    saveConfig: (times) => ipcRenderer.invoke('scheduler:save-config', times),
    getCaption: () => ipcRenderer.invoke('scheduler:get-caption'),
    saveCaption: (text) => ipcRenderer.invoke('scheduler:save-caption', text),
    getImage: () => ipcRenderer.invoke('scheduler:get-image'),
    saveImage: (base64, mimetype) => ipcRenderer.invoke('scheduler:save-image', base64, mimetype),
    sendNow: () => ipcRenderer.invoke('scheduler:send-now'),
    getLog: (lines) => ipcRenderer.invoke('scheduler:log', lines)
  });
}

module.exports = { registerSchedulerBridge };