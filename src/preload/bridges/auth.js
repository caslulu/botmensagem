function registerAuthBridge({ contextBridge, ipcRenderer }) {
  contextBridge.exposeInMainWorld('desktopAuth', {
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    getSession: () => ipcRenderer.invoke('auth:get-session'),
    logout: () => ipcRenderer.invoke('auth:logout'),
    validateAdmin: (credentials) => ipcRenderer.invoke('auth:validate-admin', credentials)
  });
}

module.exports = { registerAuthBridge };
