const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { formatVehicles, formatPeople, formatDateToMmDdYyyy } = require('../utils/formatters');
const trelloConfig = require('../../config/trello-config');

const DEFAULT_API_URL = 'https://api.trello.com/1/cards';

function sanitizeString(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
}

function composeAddress(data) {
  if (!data) {
    return '';
  }

  if (data.endereco) {
    return sanitizeString(data.endereco);
  }

  const parts = [];
  if (data.endereco_rua) {
    parts.push(sanitizeString(data.endereco_rua));
  }
  if (data.endereco_apt) {
    parts.push(`Apt ${sanitizeString(data.endereco_apt)}`);
  }

  const cityState = [sanitizeString(data.endereco_cidade), sanitizeString(data.endereco_estado)]
    .filter(Boolean)
    .join(' - ');
  const zip = sanitizeString(data.endereco_zipcode);

  if (cityState) {
    if (zip) {
      parts.push(`${cityState}, ${zip}`);
    } else {
      parts.push(cityState);
    }
  } else if (zip) {
    parts.push(zip);
  }

  return parts.filter(Boolean).join(', ');
}

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return null;
  }

  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) {
    return null;
  }

  const [, mimeType, base64] = match;
  return {
    mimeType: mimeType || 'application/octet-stream',
    buffer: Buffer.from(base64, 'base64')
  };
}

async function prepareAttachment(entry) {
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
      blob: new Blob([buffer]),
      mimeType: undefined
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
    const buffer = Buffer.isBuffer(entry.buffer)
      ? entry.buffer
      : Buffer.from(entry.buffer);
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

function parseEnv(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .reduce((acc, line) => {
      const [key, ...rest] = line.split('=');
      const value = rest.join('=').trim();
      acc[key.trim()] = value.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      return acc;
    }, {});
}

function loadEnvFromFile(envPath) {
  if (!envPath) {
    return {};
  }

  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      return parseEnv(content);
    }
  } catch (error) {
    console.warn(`Não foi possível ler ${envPath}:`, error.message);
  }

  return {};
}

function safeGetAppPath(key) {
  try {
    if (app && typeof app.getPath === 'function') {
      return app.getPath(key);
    }
  } catch (_) {
    // Ignore errors when app isn't ready
  }
  return undefined;
}

function appendEnvVariants(targetSet, basePath) {
  if (!basePath) {
    return;
  }

  const candidates = [
    '.env',
    'trello.env',
    path.join('config', '.env'),
    path.join('config', 'trello.env')
  ];

  for (const relative of candidates) {
    targetSet.add(path.join(basePath, relative));
  }
}

function getEnvSearchPaths() {
  const paths = new Set();

  appendEnvVariants(paths, process.cwd());
  appendEnvVariants(paths, path.resolve(__dirname, '../../..'));
  appendEnvVariants(paths, path.resolve(__dirname, '../../auto-trello'));

  const resourcesDir = process.resourcesPath;
  appendEnvVariants(paths, resourcesDir);

  if (resourcesDir) {
    appendEnvVariants(paths, path.join(resourcesDir, 'app.asar.unpacked'));
  }

  const exePath = safeGetAppPath('exe') || process.execPath;
  if (exePath) {
    appendEnvVariants(paths, path.dirname(exePath));
  }

  appendEnvVariants(paths, safeGetAppPath('userData'));

  return Array.from(paths);
}

function resolveEnvValue(key) {
  // 1. Verifica se está no process.env
  if (process.env[key]) {
    return process.env[key];
  }

  // 2. Verifica no arquivo de configuração compilado
  if (trelloConfig && trelloConfig[key]) {
    return trelloConfig[key];
  }

  // 3. Tenta ler de arquivos .env no sistema de arquivos
  for (const envPath of getEnvSearchPaths()) {
    const values = loadEnvFromFile(envPath);
    if (values[key]) {
      return values[key];
    }
  }

  return undefined;
}

function buildDescription(data, email) {
  const vehiclesInfo = formatVehicles(data?.veiculos);
  const peopleInfo = formatPeople(data?.pessoas);

  const address = composeAddress(data) || '-';
  const documentoEstado = sanitizeString(data?.documento_estado) || '-';
  const clienteBirth = formatDateToMmDdYyyy(data?.data_nascimento);
  const conjBirth = formatDateToMmDdYyyy(data?.data_nascimento_conjuge);

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
  }

  if (data?.observacoes) {
    description += `\nOBSERVAÇÕES:\n${sanitizeString(data.observacoes)}\n`;
  }

  return description;
}

function generateEmail(fullName) {
  if (!fullName) {
    return '';
  }

  const tokens = String(fullName)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) =>
      token
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/gi, '')
        .toLowerCase()
    )
    .filter(Boolean);

  if (!tokens.length) {
    return '';
  }

  const first = tokens[0];
  const last = tokens.length > 1 ? tokens[tokens.length - 1] : '';
  const local = last ? `${first}.${last}` : first;
  return `${local}@outlook.com`;
}

class TrelloService {
  constructor() {
    this.cachedCredentials = null;
  }

  get credentials() {
    if (this.cachedCredentials) {
      return this.cachedCredentials;
    }

    const apiKey = resolveEnvValue('TRELLO_KEY');
    const apiToken = resolveEnvValue('TRELLO_TOKEN');
    const listId = resolveEnvValue('TRELLO_ID_LIST');
    const baseUrl = resolveEnvValue('URL_TRELLO') || DEFAULT_API_URL;

    if (!apiKey || !apiToken || !listId) {
      throw new Error(
        'Credenciais do Trello não encontradas. Configure TRELLO_KEY, TRELLO_TOKEN e TRELLO_ID_LIST.'
      );
    }

    this.cachedCredentials = {
      apiKey,
      apiToken,
      listId,
      baseUrl
    };

    return this.cachedCredentials;
  }

  async trelloAuthCheck() {
    try {
      const { apiKey, apiToken } = this.credentials;
      const url = `https://api.trello.com/1/members/me?key=${encodeURIComponent(apiKey)}&token=${encodeURIComponent(apiToken)}`;
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) {
        return false;
      }
      const body = await response.json();
      return Boolean(body?.id);
    } catch (error) {
      console.error('Falha na verificação das credenciais do Trello:', error);
      return false;
    }
  }

  async createTrelloCard(data = {}) {
    const { apiKey, apiToken, listId, baseUrl } = this.credentials;

    const email = data?.email || generateEmail(data?.nome);
    const description = buildDescription(data, email);

    const params = new URLSearchParams({
      key: apiKey,
      token: apiToken,
      idList: listId,
      name: data?.nome || 'Sem Nome',
      desc: description
    });

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      method: 'POST'
    });

    if (!response.ok) {
      let message = `Falha ao criar card (status ${response.status})`;
      try {
        const err = await response.json();
        message = err?.message || message;
      } catch (_) {
        // ignore
      }
      throw new Error(message);
    }

    const body = await response.json();

    const attachments = Array.isArray(data?.attachments)
      ? data.attachments
      : Array.isArray(data?.anexos)
        ? data.anexos
        : [];

    let attachmentsResult = null;
    if (attachments.length) {
      attachmentsResult = await this.attachMultipleFiles(body.id, attachments);
    }

    return {
      id: body.id,
      url: body.shortUrl || (body.id ? `https://trello.com/c/${body.id}` : null),
      name: body.name,
      attachments: attachmentsResult
    };
  }

  async attachFile(cardId, attachment) {
    if (!cardId) {
      throw new Error('cardId é obrigatório para anexar arquivos.');
    }

    if (!attachment) {
      throw new Error('Anexo não informado.');
    }

    const { apiKey, apiToken } = this.credentials;
    const url = `https://api.trello.com/1/cards/${cardId}/attachments`;
    const { name, blob } = await prepareAttachment(attachment);
    if (!blob) {
      throw new Error('Falha ao preparar o anexo.');
    }
    const form = new FormData();
    form.append('file', blob, name);

    const requestUrl = `${url}?key=${encodeURIComponent(apiKey)}&token=${encodeURIComponent(apiToken)}`;
    const response = await fetch(requestUrl, {
      method: 'POST',
      body: form
    });

    if (!response.ok) {
      let message = `Falha ao anexar arquivo (status ${response.status})`;
      try {
        const err = await response.json();
        message = err?.message || message;
      } catch (_) {
        // ignore
      }
      throw new Error(message);
    }

    return response.json();
  }

  async attachMultipleFiles(cardId, attachments = []) {
    const summary = {
      total: attachments.length,
      sucesso: [],
      falha: []
    };

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
          : sanitizeString(entry?.name || entry?.filename || entry?.path) || 'anexo';
        summary.falha.push({ arquivo: fileName, erro: error.message });
      }
    }

    return summary;
  }
}

module.exports = new TrelloService();
