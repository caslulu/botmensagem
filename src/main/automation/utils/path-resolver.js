const path = require('path');
const fs = require('fs');

let electronApp = null;
try {
  // Lazy access to Electron app when available (main process)
  const { app } = require('electron');
  electronApp = app;
} catch (_) {
  // Not running inside Electron main process (tests/scripts)
  electronApp = null;
}

class PathResolver {
  static resolve(filePath) {
    if (filePath === undefined || filePath === null) {
      return null;
    }

    const normalized = String(filePath).trim();
    if (!normalized) {
      return null;
    }

    if (path.isAbsolute(normalized)) {
      return normalized;
    }

    return path.join(process.cwd(), normalized);
  }

  static exists(filePath) {
    return fs.existsSync(filePath);
  }

  static validate(filePath, errorMessage) {
    if (!this.exists(filePath)) {
      throw new Error(errorMessage || `Arquivo não encontrado: ${filePath}`);
    }
  }

  static async ensureDir(dirPath) {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }

  static getUserDataDir() {
    if (process.env.USER_DATA_DIR && process.env.USER_DATA_DIR.trim()) {
      return this.resolve(process.env.USER_DATA_DIR.trim());
    }
    if (electronApp && typeof electronApp.getPath === 'function') {
      return electronApp.getPath('userData');
    }
    // Dev fallback
    return path.join(process.cwd(), 'data');
  }

  static getSessionsRoot() {
    const custom = process.env.SESSIONS_ROOT && process.env.SESSIONS_ROOT.trim();
    if (custom) return this.resolve(custom);
    return path.join(this.getUserDataDir(), 'sessions');
  }

  static getProfileSessionDir(profileId) {
    return path.join(this.getSessionsRoot(), profileId);
  }
}

module.exports = PathResolver;


