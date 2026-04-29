function resolveApiUrl(): string {
  const configured = String(import.meta.env.VITE_API_URL || '').trim();
  const fallback = '/api';
  const rawUrl = configured || fallback;

  if (rawUrl.startsWith('/')) {
    return rawUrl.replace(/\/+$/, '');
  }

  try {
    const url = new URL(rawUrl);
    const isLocalConfiguredHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
    const isRemoteBrowserHost = !['localhost', '127.0.0.1'].includes(window.location.hostname);

    if (isLocalConfiguredHost && isRemoteBrowserHost) {
      url.hostname = window.location.hostname;
    }

    return url.toString().replace(/\/+$/, '');
  } catch (_) {
    return fallback.replace(/\/+$/, '');
  }
}

const API_URL = resolveApiUrl();
const AUTH_SESSION_KEY = 'botmensagem.web.authSession';
const REQUEST_TIMEOUT_MS = 15000;

export const AUTH_EXPIRED_EVENT = 'botmensagem:web-auth-expired';

export type StoredAuthSession = {
  expiresAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
};

export function getStoredSession(): StoredAuthSession | null {
  const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as StoredAuthSession;
    if (!session.user?.id || Date.parse(session.expiresAt) <= Date.now()) {
      clearStoredSession();
      return null;
    }
    return session;
  } catch (_) {
    clearStoredSession();
    return null;
  }
}

export function storeSession(session: StoredAuthSession) {
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  window.localStorage.removeItem(AUTH_SESSION_KEY);
}

function notifyAuthExpired() {
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

function filenameFromDisposition(disposition: string | null): string {
  if (!disposition) return '';
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1]);
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || '';
}

export async function downloadFile(downloadUrl: string, filename?: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(downloadUrl, {
      credentials: 'include',
      signal: controller.signal
    });
  } catch (_) {
    throw new Error('Nao foi possivel baixar o arquivo. Tente novamente.');
  } finally {
    window.clearTimeout(timeout);
  }

  if (response.status === 401) {
    clearStoredSession();
    notifyAuthExpired();
    throw new Error('Sessao expirada. Faca login novamente.');
  }

  if (!response.ok) {
    throw new Error(`Erro HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename || filenameFromDisposition(response.headers.get('content-disposition')) || 'arquivo';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      credentials: 'include',
      headers: {
        ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(init?.headers || {})
      }
    });
  } catch (_) {
    throw new Error(`Nao foi possivel conectar a API em ${API_URL}. Confirme se o container api esta rodando e tente novamente.`);
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    if (response.status === 401 && path !== '/auth/login') {
      clearStoredSession();
      notifyAuthExpired();
    }
    throw new Error(payload?.message || payload?.error || `Erro HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body || {}) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body || {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, body: FormData) => request<T>(path, { method: 'POST', body })
};
