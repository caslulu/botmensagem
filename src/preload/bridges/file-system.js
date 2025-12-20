function registerFileSystemBridge({ contextBridge, ipcRenderer }) {
  contextBridge.exposeInMainWorld('fileSystem', {
    selectImage: () => ipcRenderer.invoke('file:select-image')
  });
}

module.exports = { registerFileSystemBridge };