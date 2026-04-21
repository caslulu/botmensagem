const { ipcMain, app, shell } = require('electron');

function registerAppHandlers(getMainWindow) {
  ipcMain.handle('app:recover-focus', async () => {
    const win = typeof getMainWindow === 'function' ? getMainWindow() : null;
    try {
      if (win) {
        try { win.show(); } catch {}
        try { win.focus(); } catch {}
        try { win.webContents.focus(); } catch {}
        // Toggle always on top para "acordar" o foco do Windows
        try {
          win.setAlwaysOnTop(true, 'screen-saver');
          setTimeout(() => {
            try { win.setAlwaysOnTop(false); } catch {}
          }, 250);
        } catch {}
      } else {
        // Fallback global
        try { app.focus({ steal: true }); } catch {}
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('app:open-web-app', async () => {
    const url = process.env.WEB_APP_URL || 'http://localhost:8080';
    try {
      await shell.openExternal(url);
      return { success: true, url };
    } catch (e) {
      return { success: false, url, error: e.message };
    }
  });
}

module.exports = { registerAppHandlers };
