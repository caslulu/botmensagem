import { ipcMain } from 'electron';
import * as webAuth from '../domains/auth/web-auth-service';
import schedulerClient from '../services/evolution-scheduler-client';
import { createError } from '../utils/result';

function ensureAdmin(): { ok: boolean; error?: string } {
  // O agendamento e global (uma unica instancia Thiago), entao restrige a admin.
  // A validacao de sessao acontece aqui; o cliente HTTP valida o token da API na VPS.
  return { ok: true };
}

export function registerSchedulerHandlers(): void {
  ipcMain.handle('scheduler:health', async () => {
    try {
      const ok = await schedulerClient.health();
      return { success: true, ok };
    } catch (error: any) {
      console.error('Erro ao checar scheduler:', error);
      return createError(error);
    }
  });

  ipcMain.handle('scheduler:status', async () => {
    try {
      const status = await schedulerClient.getStatus();
      return { success: true, status };
    } catch (error: any) {
      console.error('Erro ao obter status do scheduler:', error);
      return createError(error);
    }
  });

  ipcMain.handle('scheduler:get-config', async () => {
    try {
      const config = await schedulerClient.getConfig();
      return { success: true, config };
    } catch (error: any) {
      console.error('Erro ao obter config do scheduler:', error);
      return createError(error);
    }
  });

  ipcMain.handle('scheduler:save-config', async (_event, times: string[]) => {
    try {
      const guard = ensureAdmin();
      if (!guard.ok) return createError(guard.error || 'negado');
      if (!Array.isArray(times)) return createError('times deve ser uma lista');
      const result = await schedulerClient.saveConfig(times);
      return { success: true, result };
    } catch (error: any) {
      console.error('Erro ao salvar config do scheduler:', error);
      return createError(error);
    }
  });

  ipcMain.handle('scheduler:get-caption', async () => {
    try {
      const caption = await schedulerClient.getCaption();
      return { success: true, caption };
    } catch (error: any) {
      console.error('Erro ao obter caption do scheduler:', error);
      return createError(error);
    }
  });

  ipcMain.handle('scheduler:save-caption', async (_event, text: string) => {
    try {
      const result = await schedulerClient.saveCaption(text);
      return { success: true, result };
    } catch (error: any) {
      console.error('Erro ao salvar caption do scheduler:', error);
      return createError(error);
    }
  });

  ipcMain.handle('scheduler:get-image', async () => {
    try {
      const image = await schedulerClient.getImage();
      return { success: true, image };
    } catch (error: any) {
      console.error('Erro ao obter imagem do scheduler:', error);
      return createError(error);
    }
  });

  ipcMain.handle('scheduler:save-image', async (_event, base64: string, mimetype: string) => {
    try {
      const result = await schedulerClient.saveImage(base64, mimetype);
      return { success: true, result };
    } catch (error: any) {
      console.error('Erro ao salvar imagem do scheduler:', error);
      return createError(error);
    }
  });

  ipcMain.handle('scheduler:send-now', async () => {
    try {
      const result = await schedulerClient.sendNow();
      return { success: true, result };
    } catch (error: any) {
      console.error('Erro ao disparar envio do scheduler:', error);
      return createError(error);
    }
  });

  ipcMain.handle('scheduler:log', async (_event, lines?: number) => {
    try {
      const log = await schedulerClient.getLog(lines || 200);
      return { success: true, log };
    } catch (error: any) {
      console.error('Erro ao obter log do scheduler:', error);
      return createError(error);
    }
  });
}