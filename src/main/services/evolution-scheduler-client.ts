import fs from 'fs';
import path from 'path';
import { app as electronApp } from 'electron';
import PathResolver from '../automation/utils/path-resolver';

// A VPS do scheduler (https://136.248.123.233) usa certificado self-signed/invalido.
// O curl da mesma maquina so funciona com `-k`; o fetch do Node valida o cert por
// padrao e a conexao falha antes de chegar na API (a UI entao mostra "VPS offline").
//
// Equivalente ao `-k` do curl para o fetch do Electron/Node: desativar a validacao
// TLS do servidor. Setamos a env var no processo main o mais cedo possivel
// (na importacao deste modulo, antes de qualquer request ser feito).
//
// App interno, 2 usuarios, VPS dedicada e conhecida -> superficie de MITM nao e
// uma preocupacao real aqui. O Node emite um warning unico no console; aceitavel
// pelo custo/beneficio vs. acoplar um Agent customizado.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export interface SchedulerStatus {
  times: string[];
  instance: string;
  instance_state: string;
  image_path: string;
  image_exists: boolean;
  caption_preview: string;
  caption_length: number;
  log_tail: string;
  updated_at: string;
}

export interface SchedulerConfig {
  times: string[];
}

class SchedulerApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(`Scheduler API ${status}: ${message}`);
    this.name = 'SchedulerApiError';
  }
}

function loadEnvFile(filePath: string): Record<string, string> {
  try {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf8');
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .reduce<Record<string, string>>((acc, line) => {
        const [key, ...rest] = line.split('=');
        if (!key) return acc;
        const value = rest
          .join('=')
          .trim()
          .replace(/^"|"$/g, '')
          .replace(/^'|'$/g, '');
        acc[key.trim()] = value;
        return acc;
      }, {});
  } catch {
    return {};
  }
}

function getEvolutionEnvCandidates(): string[] {
  const candidates = new Set<string>();
  const fileName = '.env.evolution';

  candidates.add(path.join(process.cwd(), fileName));

  try {
    candidates.add(path.join(PathResolver.getUserDataDir(), fileName));
  } catch {
    // no-op
  }

  try {
    if (process.resourcesPath) {
      candidates.add(path.join(process.resourcesPath, fileName));
    }
  } catch {
    // no-op
  }

  try {
    if (electronApp && typeof electronApp.getAppPath === 'function') {
      const appPath = electronApp.getAppPath();
      candidates.add(path.join(appPath, fileName));
      candidates.add(path.join(path.dirname(appPath), fileName));
    }
  } catch {
    // no-op
  }

  return Array.from(candidates);
}

function loadEvolutionEnv(): Record<string, string> {
  for (const candidate of getEvolutionEnvCandidates()) {
    const values = loadEnvFile(candidate);
    if (Object.keys(values).length > 0) return values;
  }
  return {};
}

function normalizeBaseUrl(url: string): string {
  const trimmed = (url || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (!trimmed.endsWith('/scheduler')) return `${trimmed}/scheduler`;
  return trimmed;
}

class EvolutionSchedulerClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor() {
    const envFile = loadEvolutionEnv();
    const effectiveUrl = String(
      process.env.SCHEDULER_API_URL || envFile.SCHEDULER_API_URL || envFile.SCHEDULER_URL || ''
    ).trim();
    const effectiveToken = String(
      process.env.SCHEDULER_TOKEN || envFile.SCHEDULER_TOKEN || ''
    ).trim();

    this.baseUrl = normalizeBaseUrl(effectiveUrl);
    this.token = effectiveToken;

    if (!this.baseUrl) {
      throw new Error(
        'SCHEDULER_API_URL não configurado. Defina SCHEDULER_API_URL e SCHEDULER_TOKEN no arquivo .env.evolution.'
      );
    }
  }

  private async request(p: string, init: RequestInit = {}, timeoutMs = 20000): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${p}`, {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          ...(init.headers || {})
        }
      });
    } finally {
      clearTimeout(timeout);
    }

    const text = await res.text();
    let payload: any = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { raw: text };
    }

    if (!res.ok) {
      const message =
        payload?.error || payload?.message || (typeof payload?.raw === 'string' ? payload.raw : JSON.stringify(payload));
      throw new SchedulerApiError(res.status, message);
    }

    return payload;
  }

  async health(): Promise<boolean> {
    try {
      await this.request('/health', { method: 'GET' }, 8000);
      return true;
    } catch {
      return false;
    }
  }

  async getConfig(): Promise<SchedulerConfig> {
    return this.request('/config', { method: 'GET' });
  }

  async saveConfig(times: string[]): Promise<{ ok: boolean; times: string[] }> {
    return this.request('/config', {
      method: 'POST',
      body: JSON.stringify({ times })
    });
  }

  async getCaption(): Promise<{ text: string }> {
    return this.request('/caption', { method: 'GET' });
  }

  async saveCaption(text: string): Promise<{ ok: boolean; length: number }> {
    return this.request('/caption', {
      method: 'POST',
      body: JSON.stringify({ text })
    });
  }

  async getImage(): Promise<{ base64: string; mimetype: string; size: number } | null> {
    try {
      return await this.request('/image', { method: 'GET' }, 15000);
    } catch (err) {
      if (err instanceof SchedulerApiError && err.status === 404) return null;
      throw err;
    }
  }

  async saveImage(base64: string, mimetype: string): Promise<{ ok: boolean; path: string; size: number }> {
    return this.request('/image', {
      method: 'POST',
      body: JSON.stringify({ base64, mimetype })
    }, 30000);
  }

  async getStatus(): Promise<SchedulerStatus> {
    return this.request('/status', { method: 'GET' }, 12000);
  }

  async sendNow(): Promise<{ ok: boolean; message?: string; error?: string }> {
    return this.request('/send-now', { method: 'POST' }, 10000);
  }

  async getLog(lines = 200): Promise<{ log: string }> {
    return this.request(`/log?lines=${encodeURIComponent(String(lines))}`, { method: 'GET' }, 10000);
  }
}

const evolutionSchedulerClient = new EvolutionSchedulerClient();
export default evolutionSchedulerClient;