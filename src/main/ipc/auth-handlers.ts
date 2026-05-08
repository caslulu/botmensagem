import { ipcMain } from 'electron';
import * as webAuth from '../domains/auth/web-auth-service';
import { createError, createSuccess } from '../utils/result';

export function registerAuthHandlers(): void {
  ipcMain.handle('auth:login', async (_event, credentials: { email?: string; password?: string }) => {
    try {
      const session = await webAuth.login(credentials?.email || '', credentials?.password || '');
      return createSuccess({ session });
    } catch (error) {
      return createError(error);
    }
  });

  ipcMain.handle('auth:get-session', async () => {
    try {
      const session = await webAuth.getSession();
      return createSuccess({ session });
    } catch (error) {
      return createError(error);
    }
  });

  ipcMain.handle('auth:logout', async () => {
    try {
      await webAuth.logout();
      return createSuccess();
    } catch (error) {
      return createError(error);
    }
  });

  ipcMain.handle('auth:validate-admin', async (_event, credentials: { email?: string; password?: string }) => {
    try {
      const session = await webAuth.validateAdminLogin(credentials?.email || '', credentials?.password || '');
      return createSuccess({ session });
    } catch (error) {
      return createError(error);
    }
  });
}
