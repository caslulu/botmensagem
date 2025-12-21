function registerRoadmapBridge({ contextBridge, ipcRenderer }) {
  contextBridge.exposeInMainWorld('roadmap', {
    list: () => ipcRenderer.invoke('roadmap:list'),
    create: (payload) => ipcRenderer.invoke('roadmap:create', payload),
    updateStatus: (payload) => ipcRenderer.invoke('roadmap:update-status', payload),
    update: (payload) => ipcRenderer.invoke('roadmap:update', payload),
    delete: (payload) => ipcRenderer.invoke('roadmap:delete', payload)
  });
}

module.exports = { registerRoadmapBridge };
