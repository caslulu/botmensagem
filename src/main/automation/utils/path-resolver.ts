import * as path from 'path';
import * as fs from 'fs';
import { app as electronApp } from 'electron';

class PathResolver {
  static resolve(filePath: string | null | undefined): string | null {
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

  static exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  static validate(filePath: string, errorMessage?: string): void {
    if (!this.exists(filePath)) {
      throw new Error(errorMessage || `Arquivo não encontrado: ${filePath}`);
    }
  }

  static async ensureDir(dirPath: string): Promise<void> {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }

  static getUserDataDir(): string {
    if (process.env.USER_DATA_DIR && process.env.USER_DATA_DIR.trim()) {
      return this.resolve(process.env.USER_DATA_DIR.trim()) as string;
    }
    if (electronApp && typeof electronApp.getPath === 'function') {
      return electronApp.getPath('userData');
    }
    // Dev fallback
    return path.join(process.cwd(), 'data');
  }

  static getSessionsRoot(): string {
    const custom = process.env.SESSIONS_ROOT && process.env.SESSIONS_ROOT.trim();
    if (custom) return this.resolve(custom) as string;
    return path.join(this.getUserDataDir(), 'sessions');
  }

  static getProfileSessionDir(profileId: string): string {
    return path.join(this.getSessionsRoot(), profileId);
  }
}

export default PathResolver;
// CommonJS compatibility for existing require() callers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(module as any).exports = PathResolver;
// Provide named properties for CJS consumers so bundlers keep static methods
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(module as any).exports.getUserDataDir = PathResolver.getUserDataDir;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(module as any).exports.getSessionsRoot = PathResolver.getSessionsRoot;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(module as any).exports.getProfileSessionDir = PathResolver.getProfileSessionDir;


