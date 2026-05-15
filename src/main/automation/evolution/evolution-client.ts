import { config } from '../config';
import type { EvolutionGroup, EvolutionInstanceState } from './types';
import fs from 'fs';
import path from 'path';
import { app as electronApp } from 'electron';
import PathResolver from '../utils/path-resolver';

function normalizeBaseUrl(url: string): string {
  return (url || '').trim().replace(/\/+$/, '');
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.response)) return obj.response as T[];
    if (Array.isArray(obj.chats)) return obj.chats as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
    if (Array.isArray(obj.records)) return obj.records as T[];
    if (Array.isArray(obj.groups)) return obj.groups as T[];
    if (obj.instance && Array.isArray((obj.instance as any).data)) return (obj.instance as any).data as T[];
    if (obj.instance && Array.isArray((obj.instance as any).chats)) return (obj.instance as any).chats as T[];
  }
  return [];
}

function parseBooleanLike(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1 ? true : value === 0 ? false : undefined;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'sim'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'nao', 'não'].includes(normalized)) return false;
  }
  return undefined;
}

export default class EvolutionClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly envSources: string[];

  constructor() {
    const envLookup = loadEvolutionEnv();
    const envFile = envLookup.values;
    const effectiveBaseUrl = String(
      config.EVOLUTION_API_BASE_URL || envFile.EVOLUTION_API_BASE_URL || envFile.SERVER_URL || 'http://127.0.0.1:8080'
    ).trim();
    const effectiveApiKey = String(
      config.EVOLUTION_API_KEY || envFile.EVOLUTION_API_KEY || envFile.AUTHENTICATION_API_KEY || ''
    ).trim();

    this.baseUrl = normalizeBaseUrl(effectiveBaseUrl);
    this.apiKey = effectiveApiKey;
    this.envSources = envLookup.sources;
    if (!this.baseUrl) throw new Error('EVOLUTION_API_BASE_URL não configurado.');
    if (!this.apiKey) {
      throw new Error(
        `EVOLUTION_API_KEY não configurado. Verifique o arquivo .env.evolution. Caminhos verificados: ${this.envSources.join(', ')}`
      );
    }
  }

  private async request(path: string, init: RequestInit = {}, timeoutMs = 30000): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          apikey: this.apiKey,
          'Content-Type': 'application/json',
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
      const details = payload?.message || payload?.error || JSON.stringify(payload);
      throw new Error(`Evolution API ${res.status}: ${details}`);
    }

    return payload;
  }

  async healthcheck(): Promise<void> {
    await this.request('/');
  }

  async ensureInstance(instanceName: string): Promise<void> {
    const instances = await this.fetchInstances();
    const exists = instances.some((name) => name === instanceName);
    if (exists) return;

    await this.request('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      })
    });
  }

  async connectInstance(instanceName: string): Promise<any> {
    return this.request(`/instance/connect/${encodeURIComponent(instanceName)}`, {
      method: 'GET'
    });
  }

  async getConnectionState(instanceName: string): Promise<EvolutionInstanceState> {
    const payload = await this.request(`/instance/connectionState/${encodeURIComponent(instanceName)}`, {
      method: 'GET'
    });

    const state = String(payload?.instance?.state || payload?.state || '').toLowerCase();
    const connected = state === 'open' || state === 'connected';

    return {
      instanceName,
      connected,
      raw: payload
    };
  }

  async fetchGroups(instanceName: string): Promise<EvolutionGroup[]> {
    const encoded = encodeURIComponent(instanceName);
    const endpoint = `/group/fetchAllGroups/${encoded}?getParticipants=false`;
    let lastError: Error | null = null;
    let payload: any = null;

    // A API pode demorar após reconexão; tentamos algumas vezes com backoff.
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        payload = await this.request(endpoint, { method: 'GET' }, 120000);
        break;
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          lastError = new Error(`Timeout ao buscar grupos em ${endpoint}`);
        } else {
          lastError = error as Error;
        }
        if (attempt < 4) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 3000));
        }
      }
    }

    if (!payload) {
      throw new Error(`Falha ao buscar grupos na Evolution API: ${lastError?.message || 'erro desconhecido'}`);
    }

    const groups = asArray<any>(payload);
    return groups
      .map((g) => {
        const id = String(g?.id || g?.jid || g?.groupId || '').trim();
        const subject = String(g?.subject || g?.name || id).trim();
        return { id, subject };
      })
      .filter((g) => !!g.id);
  }

  async fetchArchivedGroupIds(instanceName: string): Promise<Set<string>> {
    const encoded = encodeURIComponent(instanceName);
    const endpoint = `/chat/findChats/${encoded}`;
    const attempts: Array<{ body?: Record<string, unknown>; method: 'POST' | 'GET'; assumeArchived: boolean }> = [
      { method: 'POST', body: { where: { archived: true } }, assumeArchived: true },
      { method: 'POST', body: { where: { archive: true } }, assumeArchived: true },
      { method: 'POST', body: { where: { archived: true, isGroup: true } }, assumeArchived: true },
      { method: 'POST', body: { where: { archive: true, isGroup: true } }, assumeArchived: true },
      { method: 'POST', body: { where: { archived: true }, take: 10000, skip: 0 }, assumeArchived: true },
      { method: 'POST', body: { where: {}, take: 10000, skip: 0 }, assumeArchived: false },
      { method: 'POST', body: {}, assumeArchived: false },
      { method: 'GET', assumeArchived: false }
    ];

    const errors: string[] = [];
    const groupIdsWithoutArchiveFlag = new Set<string>();

    for (const attempt of attempts) {
      try {
        const payload = await this.request(
          endpoint,
          {
            method: attempt.method,
            ...(attempt.method === 'POST' ? { body: JSON.stringify(attempt.body || {}) } : {})
          },
          90000
        );

        const chats = asArray<any>(payload);
        if (!chats.length) {
          continue;
        }

        const ids = new Set<string>();
        for (const chat of chats) {
          const jid = String(
            chat?.id ||
              chat?.remoteJid ||
              chat?.jid ||
              chat?.chatId ||
              chat?.key?.remoteJid ||
              chat?.lastMessage?.key?.remoteJid ||
              ''
          ).trim();
          const archivedRaw =
            chat?.archived ??
            chat?.archive ??
            chat?.isArchived ??
            chat?.isArchive;
          const archivedParsed = parseBooleanLike(archivedRaw);
          const archived = archivedParsed === undefined ? attempt.assumeArchived : archivedParsed;
          const isGroup = jid.endsWith('@g.us') || Boolean(chat?.isGroup);

          if (attempt.assumeArchived && isGroup && jid && archivedParsed === undefined) {
            groupIdsWithoutArchiveFlag.add(jid);
          }

          if (archived && isGroup && jid) {
            ids.add(jid);
          }
        }

        if (ids.size > 0) {
          return ids;
        }
      } catch (error: any) {
        errors.push((error as Error)?.message || String(error));
      }
    }

    if (groupIdsWithoutArchiveFlag.size > 0) {
      return groupIdsWithoutArchiveFlag;
    }

    throw new Error(`Falha ao buscar chats arquivados: ${errors.join(' | ')}`);
  }

  async sendText(instanceName: string, number: string, text: string): Promise<any> {
    return this.request(`/message/sendText/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      body: JSON.stringify({
        number,
        text
      })
    });
  }

  async sendImage(instanceName: string, number: string, imagePath: string, caption: string): Promise<any> {
    const mediaDataUrl = this.readFileAsDataUrl(imagePath);
    const mediaBase64 = this.readFileAsBase64(imagePath);
    const mimetype = this.mimeByExt(path.extname(imagePath).toLowerCase());
    const fileName = path.basename(imagePath);
    const encoded = encodeURIComponent(instanceName);
    const attempts: Array<{ endpoint: string; body: Record<string, unknown> }> = [
      {
        endpoint: `/message/sendMedia/${encoded}`,
        body: { number, mediatype: 'image', mimetype, media: mediaDataUrl, caption, fileName, linkPreview: false }
      },
      {
        endpoint: `/message/sendMedia/${encoded}`,
        body: { number, mediatype: 'image', mimetype, media: mediaBase64, caption, fileName, linkPreview: false }
      },
      {
        endpoint: `/message/sendMedia/${encoded}`,
        body: { remoteJid: number, mediatype: 'image', mimetype, media: mediaBase64, caption, fileName, linkPreview: false }
      },
      {
        endpoint: `/message/sendMedia/${encoded}`,
        body: { number, mediaType: 'image', mimeType: mimetype, media: mediaBase64, caption, fileName, linkPreview: false }
      }
    ];

    const errors: string[] = [];
    for (const attempt of attempts) {
      try {
        return await this.request(attempt.endpoint, {
          method: 'POST',
          body: JSON.stringify(attempt.body)
        }, 90000);
      } catch (error: any) {
        errors.push(`${attempt.endpoint}: ${(error as Error)?.message || String(error)}`);
      }
    }

    throw new Error(`Falha ao enviar imagem. Tentativas: ${errors.join(' | ')}`);
  }

  private async fetchInstances(): Promise<string[]> {
    const payload = await this.request('/instance/fetchInstances', {
      method: 'GET'
    });

    const instances = asArray<any>(payload);
    return instances
      .map((item) => String(item?.name || item?.instance?.instanceName || item?.instanceName || '').trim())
      .filter(Boolean);
  }

  private readFileAsDataUrl(filePath: string): string {
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = this.mimeByExt(ext);
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }

  private readFileAsBase64(filePath: string): string {
    return fs.readFileSync(filePath).toString('base64');
  }

  private mimeByExt(ext: string): string {
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.webp':
        return 'image/webp';
      case '.gif':
        return 'image/gif';
      default:
        return 'application/octet-stream';
    }
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
        const value = rest.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
        acc[key.trim()] = value;
        return acc;
      }, {});
  } catch {
    return {};
  }
}

function loadEvolutionEnv(): { values: Record<string, string>; sources: string[] } {
  const candidates = getEvolutionEnvCandidates();
  for (const candidate of candidates) {
    const values = loadEnvFile(candidate);
    if (Object.keys(values).length > 0) {
      return { values, sources: candidates };
    }
  }
  return { values: {}, sources: candidates };
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
      // Packaged apps usually run from resources/app.asar; this path allows reading env bundled in the app.
      candidates.add(path.join(appPath, fileName));
      candidates.add(path.join(path.dirname(appPath), fileName));
    }
  } catch {
    // no-op
  }

  return Array.from(candidates);
}
