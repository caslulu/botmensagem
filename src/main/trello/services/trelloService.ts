import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import trelloConfig from '../../config/trello-config';
import { formatVehicles, formatPeople, formatDateToMmDdYyyy } from '../utils/formatters';

const DEFAULT_API_URL = 'https://api.trello.com/1/cards';

type AttachmentInput =
  | string
  | {
      path?: string;
      name?: string;
      filename?: string;
      mimeType?: string;
      type?: string;
      dataUrl?: string;
      base64?: string;
      buffer?: Buffer | ArrayBuffer | ArrayBufferView;
      arrayBuffer?: ArrayBuffer;
    };

type TrelloCredentials = {
  apiKey: string;
  apiToken: string;
  listId: string;
  baseUrl: string;
};

type TrelloCardResponse = {
  id: string;
  shortUrl?: string;
  name?: string;
};

type AttachmentSummary = {
  total: number;
  sucesso: Array<{ arquivo: string; data: any }>; // eslint-disable-line @typescript-eslint/no-explicit-any
  falha: Array<{ arquivo: string; erro: string }>;
};

type TrelloCardInput = {
  nome?: string;
  email?: string;
  veiculos?: unknown;
  pessoas?: unknown;
  documento?: string;
  documento_estado?: string;
  estado_civil?: string;
  genero?: string;
  endereco?: string;
  endereco_rua?: string;
  endereco_apt?: string;
  endereco_cidade?: string;
  endereco_estado?: string;
  endereco_zipcode?: string;
  tempo_de_seguro?: string;
  tempo_no_endereco?: string;
  data_nascimento?: string;
  data_nascimento_conjuge?: string;
  documento_conjuge?: string;
  documento_estado_conjuge?: string;
  nome_conjuge?: string;
  observacoes?: string;
  attachments?: AttachmentInput[];
  anexos?: AttachmentInput[];
};

type PreparedAttachment = {
  name: string;
  blob: Blob;
  mimeType?: string;
};

function sanitizeString(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function composeAddress(data: TrelloCardInput | undefined): string {
  if (!data) return '';
  if (data.endereco) return sanitizeString(data.endereco);

  const parts: string[] = [];
  if (data.endereco_rua) parts.push(sanitizeString(data.endereco_rua));
  if (data.endereco_apt) parts.push(`Apt ${sanitizeString(data.endereco_apt)}`);

  const cityState = [sanitizeString(data.endereco_cidade), sanitizeString(data.endereco_estado)]
    .filter(Boolean)
    .join(' - ');
  const zip = sanitizeString(data.endereco_zipcode);

  if (cityState) {
    parts.push(zip ? `${cityState}, ${zip}` : cityState);
  } else if (zip) {
    parts.push(zip);
  }

  return parts.filter(Boolean).join(', ');
}

function parseDataUrl(dataUrl: string | undefined): { mimeType: string; buffer: Buffer } | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) return null;
  const [, mimeType, base64] = match;
  return {
    mimeType: mimeType || 'application/octet-stream',
    buffer: Buffer.from(base64, 'base64')
  };
}

async function prepareAttachment(entry: AttachmentInput): Promise<PreparedAttachment> {
  if (!entry) {
    throw new Error('Anexo inválido.');
  }

  if (typeof entry === 'string') {
    const absolutePath = path.resolve(entry);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Arquivo não encontrado: ${absolutePath}`);
    }
    const buffer = await fs.promises.readFile(absolutePath);
    return {
      name: path.basename(absolutePath),
      blob: new Blob([buffer])
    };
  }

  if (entry.path) {
    return prepareAttachment(entry.path);
  }

  const name = sanitizeString(entry.name || entry.filename) || 'anexo';
  const mimeTypeHint = sanitizeString(entry.mimeType || entry.type) || undefined;

  if (entry.dataUrl) {
    const parsed = parseDataUrl(entry.dataUrl);
    if (!parsed) {
      throw new Error('DataURL de anexo inválido.');
    }
    return {
      name,
      blob: new Blob([parsed.buffer], { type: mimeTypeHint || parsed.mimeType || 'application/octet-stream' }),
      mimeType: mimeTypeHint || parsed.mimeType
    };
  }

  if (entry.base64) {
    const buffer = Buffer.from(entry.base64, 'base64');
    return {
      name,
      blob: new Blob([buffer], { type: mimeTypeHint || 'application/octet-stream' }),
      mimeType: mimeTypeHint
    };
  }

  if (entry.buffer) {
    const raw = entry.buffer;
    const buffer = Buffer.isBuffer(raw)
      ? raw
      : raw instanceof ArrayBuffer
        ? Buffer.from(new Uint8Array(raw))
        : ArrayBuffer.isView(raw)
          ? Buffer.from(new Uint8Array((raw as ArrayBufferView<ArrayBufferLike>).buffer))
          : Buffer.from([]);
    return {
      name,
      blob: new Blob([buffer], { type: mimeTypeHint || 'application/octet-stream' }),
      mimeType: mimeTypeHint
    };
  }

  if (entry.arrayBuffer instanceof ArrayBuffer) {
    const buffer = Buffer.from(entry.arrayBuffer);
    return {
      name,
      blob: new Blob([buffer], { type: mimeTypeHint || 'application/octet-stream' }),
      mimeType: mimeTypeHint
    };
  }

  throw new Error('Formato de anexo não suportado.');
}

function parseEnv(content: string): Record<string, string> {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .reduce<Record<string, string>>((acc, line) => {
      const [key, ...rest] = line.split('=');
      const value = rest.join('=').trim();
      acc[key.trim()] = value.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      return acc;
    }, {});
}

function loadEnvFromFile(envPath: string | undefined): Record<string, string> {
  if (!envPath) return {};
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      return parseEnv(content);
    }
  } catch (error) {
    console.warn(`Não foi possível ler ${envPath}:`, (error as Error).message);
  }
  return {};
}

function safeGetAppPath(key: Parameters<typeof app.getPath>[0]): string | undefined {
  try {
    if (app && typeof app.getPath === 'function') {
      return app.getPath(key);
    }
  } catch (_) {
    // Ignore errors when app isn't ready
  }
  return undefined;
}

function appendEnvVariants(targetSet: Set<string>, basePath: string | undefined) {
  if (!basePath) return;
  const candidates = ['.env', 'trello.env', path.join('config', '.env'), path.join('config', 'trello.env')];
  for (const relative of candidates) {
    targetSet.add(path.join(basePath, relative));
  }
}

function getEnvSearchPaths(): string[] {
  const paths = new Set<string>();
  appendEnvVariants(paths, process.cwd());
  appendEnvVariants(paths, path.resolve(__dirname, '../../..'));
  appendEnvVariants(paths, path.resolve(__dirname, '../../auto-trello'));

  const resourcesDir = process.resourcesPath;
  appendEnvVariants(paths, resourcesDir);
  if (resourcesDir) appendEnvVariants(paths, path.join(resourcesDir, 'app.asar.unpacked'));

  const exePath = safeGetAppPath('exe') || process.execPath;
  if (exePath) appendEnvVariants(paths, path.dirname(exePath));

  appendEnvVariants(paths, safeGetAppPath('userData'));
  return Array.from(paths);
}

function resolveEnvValue(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  if (trelloConfig && (trelloConfig as Record<string, string>)[key]) {
    return (trelloConfig as Record<string, string>)[key];
  }
  for (const envPath of getEnvSearchPaths()) {
    const values = loadEnvFromFile(envPath);
    if (values[key]) return values[key];
  }
  return undefined;
}

function buildDescription(data: TrelloCardInput | undefined, email: string): string {
  const vehiclesInfo = formatVehicles(data?.veiculos);
  const peopleInfo = formatPeople(data?.pessoas);

  const address = composeAddress(data) || '-';
  const documentoEstado = sanitizeString(data?.documento_estado) || '-';
  const clienteBirth = formatDateToMmDdYyyy(data?.data_nascimento);
  const conjBirth = formatDateToMmDdYyyy(data?.data_nascimento_conjuge);
  const conjDocState = sanitizeString(data?.documento_estado_conjuge) || '-';

  let description = '';
  description += `Documento: ${sanitizeString(data?.documento) || '-'}\n`;
  description += `Estado do Documento: ${documentoEstado}\n`;
  description += `Estado Civil: ${sanitizeString(data?.estado_civil) || '-'}\n`;
  description += `Gênero: ${sanitizeString(data?.genero) || '-'}\n`;
  description += `Endereço: ${address}\n`;
  description += `Data de Nascimento: ${clienteBirth || '-'}\n`;
  description += `Tempo de Seguro: ${sanitizeString(data?.tempo_de_seguro) || '-'}\n`;
  description += `Tempo no Endereço: ${sanitizeString(data?.tempo_no_endereco) || '-'}\n`;
  description += `Email: ${email || '-'}\n`;
  description += vehiclesInfo;
  description += peopleInfo;

  if (data?.nome_conjuge) {
    description += `\nINFORMAÇÕES DO CÔNJUGE:\n`;
    description += `Nome: ${sanitizeString(data.nome_conjuge) || '-'}\n`;
    description += `Data de Nascimento: ${conjBirth || '-'}\n`;
    description += `Documento: ${sanitizeString(data?.documento_conjuge) || '-'}\n`;
    description += `Estado do Documento: ${conjDocState}\n`;
  }

  if (data?.observacoes) {
    description += `\nOBSERVAÇÕES:\n${sanitizeString(data.observacoes)}\n`;
  }

  return description;
}

function generateEmail(fullName: string | undefined, documentNumber: string | undefined): string {
  const sanitized = String(fullName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .toLowerCase();

  const doc = String(documentNumber || '').replace(/[^0-9]/g, '');

  if (!sanitized) {
    return `cliente${doc}@outlook.com`;
  }

  const tokens = sanitized.split(/\s+/).filter(Boolean);
  const firstName = tokens[0];
  const lastName = tokens.length > 1 ? tokens[tokens.length - 1] : '';
  const localPart = lastName ? `${firstName}${lastName}` : firstName;

  return `${localPart}${doc}@outlook.com`;
}

class TrelloService {
  private cachedCredentials: TrelloCredentials | null = null;

  private get credentials(): TrelloCredentials {
    if (this.cachedCredentials) {
      return this.cachedCredentials;
    }

    const apiKey = resolveEnvValue('TRELLO_KEY');
    const apiToken = resolveEnvValue('TRELLO_TOKEN');
    const listId = resolveEnvValue('TRELLO_ID_LIST');
    const baseUrl = resolveEnvValue('URL_TRELLO') || DEFAULT_API_URL;

    if (!apiKey || !apiToken || !listId) {
      throw new Error('Credenciais do Trello não encontradas. Configure TRELLO_KEY, TRELLO_TOKEN e TRELLO_ID_LIST.');
    }

    this.cachedCredentials = { apiKey, apiToken, listId, baseUrl };
    return this.cachedCredentials;
  }

  async trelloAuthCheck(): Promise<boolean> {
    try {
      const { apiKey, apiToken } = this.credentials;
      const url = `https://api.trello.com/1/members/me?key=${encodeURIComponent(apiKey)}&token=${encodeURIComponent(apiToken)}`;
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) return false;
      const body = (await response.json()) as { id?: string };
      return Boolean(body?.id);
    } catch (error) {
      console.error('Falha na verificação das credenciais do Trello:', error);
      return false;
    }
  }

  async createTrelloCard(data: TrelloCardInput = {}): Promise<{
    id: string;
    url: string;
    name?: string;
    attachments: AttachmentSummary | null;
  }> {
    const { apiKey, apiToken, listId, baseUrl } = this.credentials;

    const email = data?.email || generateEmail(data?.nome, data?.documento);
    const description = buildDescription(data, email);

    const params = new URLSearchParams({
      key: apiKey,
      token: apiToken,
      idList: listId,
      name: data?.nome || 'Sem Nome',
      desc: description
    });

    const response = await fetch(`${baseUrl}?${params.toString()}`, { method: 'POST' });
    if (!response.ok) {
      let message = `Falha ao criar card (status ${response.status})`;
      try {
        const err = (await response.json()) as { message?: string };
        message = err?.message || message;
      } catch (_) {
        // ignore
      }
      throw new Error(message);
    }

    const body = (await response.json()) as TrelloCardResponse;

    const attachments = Array.isArray(data?.attachments)
      ? data.attachments
      : Array.isArray(data?.anexos)
        ? data.anexos
        : [];

    let attachmentsResult: AttachmentSummary | null = null;
    if (attachments.length) {
      attachmentsResult = await this.attachMultipleFiles(body.id, attachments);
    }

    return {
      id: body.id,
      url: body.shortUrl || (body.id ? `https://trello.com/c/${body.id}` : ''),
      name: body.name,
      attachments: attachmentsResult
    };
  }

  async attachFile(cardId: string, attachment: AttachmentInput): Promise<any> {
    const { apiKey, apiToken } = this.credentials;
    if (!cardId) throw new Error('cardId é obrigatório para anexar arquivos.');
    if (!attachment) throw new Error('Anexo não informado.');

    const url = `https://api.trello.com/1/cards/${cardId}/attachments`;
    const { name, blob } = await prepareAttachment(attachment);
    if (!blob) throw new Error('Falha ao preparar o anexo.');

    const form = new FormData();
    form.append('file', blob, name);

    const requestUrl = `${url}?key=${encodeURIComponent(apiKey)}&token=${encodeURIComponent(apiToken)}`;
    const response = await fetch(requestUrl, { method: 'POST', body: form });

    if (!response.ok) {
      let message = `Falha ao anexar arquivo (status ${response.status})`;
      try {
        const err = (await response.json()) as { message?: string };
        message = err?.message || message;
      } catch (_) {
        // ignore
      }
      throw new Error(message);
    }

    return response.json();
  }

  async attachMultipleFiles(cardId: string, attachments: AttachmentInput[] = []): Promise<AttachmentSummary> {
    const summary: AttachmentSummary = { total: attachments.length, sucesso: [], falha: [] };

    for (const entry of attachments) {
      try {
        const data = await this.attachFile(cardId, entry);
        const fileName = typeof entry === 'string'
          ? path.basename(entry)
          : sanitizeString(entry?.name || entry?.filename || entry?.path) || 'anexo';
        summary.sucesso.push({ arquivo: fileName, data });
      } catch (error) {
        const fileName = typeof entry === 'string'
          ? path.basename(entry)
          : sanitizeString((entry as any)?.name || (entry as any)?.filename || (entry as any)?.path) || 'anexo';
        summary.falha.push({ arquivo: fileName, erro: (error as Error).message });
      }
    }

    return summary;
  }
}

const trelloService = new TrelloService();
export default trelloService;
// CommonJS compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(module as any).exports = trelloService;
