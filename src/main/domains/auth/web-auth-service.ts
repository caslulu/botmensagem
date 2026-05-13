import fs from 'fs';
import path from 'path';
import { app } from 'electron';

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
};

type AuthSession = {
  expiresAt: string;
  user: AuthUser;
};

type SessionProfile = {
  id: string;
  name: string;
  thumbnail?: string;
  isAdmin: boolean;
};

type StoredDesktopSession = AuthSession & {
  cookie: string;
};

class ApiHttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
  }
}

function isRouteNotFoundMessage(message: string): boolean {
  const normalized = String(message || '').toLowerCase();
  return (
    normalized.includes('rota nao encontrada') ||
    normalized.includes('rota não encontrada') ||
    normalized.includes('not found')
  );
}

const SESSION_FILE = 'web-auth-session.json';
const SESSION_COOKIE_NAME = 'botmensagem_session';
const REQUEST_TIMEOUT_MS = 10000;

let currentSession: StoredDesktopSession | null = null;

function uniqueValues(values: string[]): string[] {
  return values.filter((value, index, list) => value && list.indexOf(value) === index);
}

function resolveApiUrls(): string[] {
  const configured =
    process.env.DESKTOP_API_URL ||
    process.env.WEB_API_URL ||
    process.env.API_URL ||
    process.env.VITE_API_URL ||
    '';
  const trimmed = configured.trim();

  const urls: string[] = [];

  if (trimmed && !trimmed.startsWith('/')) {
    urls.push(trimmed.replace(/\/+$/, ''));
  }

  const webAppUrl = (process.env.WEB_APP_URL || '').trim();
  if (webAppUrl) {
    try {
      urls.push(new URL(trimmed || '/api', webAppUrl).toString().replace(/\/+$/, ''));
    } catch (_) {
      // Cai no padrao local abaixo.
    }
  }

  urls.push('http://64.181.188.115:3000');
  urls.push('http://64.181.188.115/api');
  urls.push('http://localhost:3000');
  urls.push('http://localhost:8080/api');
  return uniqueValues(urls);
}

function sessionPath(): string {
  return path.join(app.getPath('userData'), SESSION_FILE);
}

function loadStoredSession(): StoredDesktopSession | null {
  if (currentSession) return currentSession;

  try {
    const raw = fs.readFileSync(sessionPath(), 'utf8');
    const parsed = JSON.parse(raw) as StoredDesktopSession;
    if (!parsed?.cookie || !parsed?.user?.id || Date.parse(parsed.expiresAt) <= Date.now()) {
      clearSession();
      return null;
    }
    currentSession = parsed;
    return currentSession;
  } catch (_) {
    return null;
  }
}

function saveSession(session: StoredDesktopSession): void {
  currentSession = session;
  try {
    fs.mkdirSync(path.dirname(sessionPath()), { recursive: true });
    fs.writeFileSync(sessionPath(), JSON.stringify(session, null, 2), 'utf8');
  } catch (error) {
    console.warn('Falha ao salvar sessao cloud do desktop:', (error as Error).message);
  }
}

function clearSession(): void {
  currentSession = null;
  try {
    fs.rmSync(sessionPath(), { force: true });
  } catch (_) {
    // Sessao ausente nao e erro.
  }
}

function cookieFromHeaders(headers: Headers): string {
  const rawSetCookie = headers.get('set-cookie') || '';
  const cookies = rawSetCookie.split(/,(?=\s*[^;,]+=)/).map((part) => part.trim());
  const sessionCookie = cookies.find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!sessionCookie) return '';
  return sessionCookie.split(';')[0];
}

async function apiRequest<T>(pathName: string, init: RequestInit = {}): Promise<{ payload: T; cookie?: string }> {
  const failures: string[] = [];

  for (const apiUrl of resolveApiUrls()) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${apiUrl}${pathName}`, {
        ...init,
        signal: controller.signal,
        headers: {
          ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
          ...(init.headers || {})
        }
      });

      const payload = (await response.json().catch(() => null)) as T | { message?: string } | null;
      if (!response.ok) {
        const message = (payload as { message?: string } | null)?.message || `Erro HTTP ${response.status}`;
        throw new ApiHttpError(message, response.status);
      }

      return {
        payload: payload as T,
        cookie: cookieFromHeaders(response.headers)
      };
    } catch (error) {
      if (error instanceof ApiHttpError) {
        if (error.status === 404 || isRouteNotFoundMessage(error.message)) {
          failures.push(`${apiUrl}: ${error.message}`);
          continue;
        }
        throw error;
      }
      const message = error instanceof Error ? error.message : 'falha desconhecida';
      failures.push(`${apiUrl}: ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`Nao foi possivel conectar na API cloud. Testei: ${failures.join(' | ')}. Verifique se a API esta rodando ou configure DESKTOP_API_URL.`);
}

export async function requestWebApi<T>(pathName: string, init: RequestInit = {}): Promise<T> {
  const session = loadStoredSession();
  if (!session) {
    throw new Error('Login necessario.');
  }

  const headers = {
    Cookie: session.cookie,
    ...(init.headers || {})
  };

  const { payload } = await apiRequest<T>(pathName, {
    ...init,
    headers
  });
  return payload;
}

function mapUserToSessionProfile(user: AuthUser): SessionProfile {
  return {
    id: user.id,
    name: user.name,
    thumbnail: user.avatarUrl || undefined,
    isAdmin: user.role === 'admin'
  };
}

function toDesktopSession(session: StoredDesktopSession) {
  return {
    expiresAt: session.expiresAt,
    user: session.user,
    profile: mapUserToSessionProfile(session.user)
  };
}

export async function login(email: string, password: string) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const rawPassword = String(password || '');
  if (!normalizedEmail || rawPassword.length < 8) {
    throw new Error('Email ou senha invalidos.');
  }

  const { payload, cookie } = await apiRequest<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: normalizedEmail, password: rawPassword })
  });

  if (!cookie) {
    throw new Error('API cloud nao retornou a sessao de login.');
  }

  const session: StoredDesktopSession = {
    ...payload,
    cookie
  };
  saveSession(session);
  return toDesktopSession(session);
}

export async function getSession() {
  const session = loadStoredSession();
  if (!session) {
    return { authenticated: false };
  }

  try {
    const { payload } = await apiRequest<{ user: AuthUser }>('/auth/me', {
      method: 'GET',
      headers: {
        Cookie: session.cookie
      }
    });
    const refreshed = { ...session, user: payload.user };
    saveSession(refreshed);
    return { authenticated: true, ...toDesktopSession(refreshed) };
  } catch (error) {
    clearSession();
    throw error;
  }
}

export async function logout() {
  const session = loadStoredSession();
  if (session) {
    await apiRequest('/auth/logout', {
      method: 'POST',
      headers: {
        Cookie: session.cookie
      }
    }).catch(() => undefined);
  }
  clearSession();
  return { success: true };
}

export async function validateAdminLogin(email: string, password: string) {
  const session = await login(email, password);
  if (session.user.role !== 'admin') {
    await logout();
    throw new Error('A conta informada nao e administradora.');
  }
  return session;
}
