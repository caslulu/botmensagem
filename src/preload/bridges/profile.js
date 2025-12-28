function registerProfileBridge({ contextBridge, ipcRenderer }) {
  contextBridge.exposeInMainWorld('profile', {
    getProfiles: () => ipcRenderer.invoke('automation:profiles'),
    create: (profile) => ipcRenderer.invoke('profile:create', profile),
    getSettings: (profileId) => ipcRenderer.invoke('profile:get-settings', profileId),
    updateSendLimit: (profileId, sendLimit) => ipcRenderer.invoke('profile:update-send-limit', profileId, sendLimit),
    update: (profileId, updates) => ipcRenderer.invoke('profile:update', profileId, updates),
    delete: (profileId) => ipcRenderer.invoke('profile:delete', profileId)
  });
}

module.exports = { registerProfileBridge };