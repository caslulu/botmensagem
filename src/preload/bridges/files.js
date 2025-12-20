function registerFilesBridge({ contextBridge, ipcRenderer }) {
  contextBridge.exposeInMainWorld('files', {
    saveToDownloads: (srcPath, suggestedName) => ipcRenderer.invoke('file:save-to-downloads', srcPath, suggestedName),
    showInFolder: (targetPath) => ipcRenderer.invoke('file:show-in-folder', targetPath),
    openPath: (targetPath) => ipcRenderer.invoke('file:open-path', targetPath),
    selectImage: () => ipcRenderer.invoke('file:select-image')
  });
}

module.exports = { registerFilesBridge };