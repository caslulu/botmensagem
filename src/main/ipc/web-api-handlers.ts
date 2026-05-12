import { ipcMain } from 'electron';
import { requestWebApi } from '../domains/auth/web-auth-service';
import { createError, createSuccess } from '../utils/result';

const allowedMethods = new Set(['GET', 'POST', 'PATCH', 'DELETE']);

function normalizePath(pathName: string): string {
  const value = String(pathName || '').trim();
  if (!value.startsWith('/')) {
    throw new Error('Rota invalida.');
  }
  if (
    !value.startsWith('/kanban') &&
    !value.startsWith('/vehicles') &&
    !value.startsWith('/quotes') &&
    !value.startsWith('/users') &&
    !value.startsWith('/messages') &&
    !value.startsWith('/profile')
  ) {
    throw new Error('Rota nao permitida no desktop.');
  }
  return value;
}

export function registerWebApiHandlers(): void {
  ipcMain.handle('web-api:request', async (_event, payload: { method?: string; path?: string; body?: unknown }) => {
    try {
      const method = String(payload?.method || 'GET').toUpperCase();
      if (!allowedMethods.has(method)) {
        throw new Error('Metodo nao permitido.');
      }

      const pathName = normalizePath(payload?.path || '');
      const body = method === 'GET' || method === 'DELETE' ? undefined : JSON.stringify(payload?.body || {});
      const data = await requestWebApi(pathName, {
        method,
        ...(body ? { body } : {})
      });

      return createSuccess({ data });
    } catch (error) {
      return createError(error);
    }
  });
}
