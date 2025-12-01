/**
 * Utilitário para resolver e validar caminhos
 */

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
  /**
   * Resolve um caminho relativo para absoluto
   * @param {string} filePath - Caminho do arquivo
   * @returns {string} Caminho absoluto
   */
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

  /**
   * Verifica se um arquivo existe
   * @param {string} filePath - Caminho do arquivo
   * @returns {boolean} True se existe
   */
  static exists(filePath) {
    return fs.existsSync(filePath);
  }

  /**
   * Valida se um arquivo existe, lança erro se não existir
   * @param {string} filePath - Caminho do arquivo
   * @param {string} errorMessage - Mensagem de erro personalizada
   * @throws {Error} Se o arquivo não existir
   */
  static validate(filePath, errorMessage) {
    if (!this.exists(filePath)) {
      throw new Error(errorMessage || `Arquivo não encontrado: ${filePath}`);
    }
  }

  /**
   * Cria um diretório recursivamente se não existir
   * @param {string} dirPath - Caminho do diretório
   * @returns {Promise<void>}
   */
  static async ensureDir(dirPath) {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }

  /**
   * Diretório de dados do usuário (persistência segura para produção)
   * Fallback para ./data quando app não estiver disponível (dev/cli)
   */
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

  /**
   * Diretório raiz para sessões do WhatsApp
   * Pode ser customizado via env SESSIONS_ROOT
   */
  static getSessionsRoot() {
    const custom = process.env.SESSIONS_ROOT && process.env.SESSIONS_ROOT.trim();
    if (custom) return this.resolve(custom);
    return path.join(this.getUserDataDir(), 'sessions');
  }

  /**
   * Diretório de sessão para um perfil específico
   */
  static getProfileSessionDir(profileId) {
    return path.join(this.getSessionsRoot(), profileId);
  }
}

module.exports = PathResolver;


