import { ipcMain } from 'electron';
import rtaService from '../rta/services/rtaService';
import { createSuccess, createError } from '../utils/result';

export function registerRtaHandlers(): void {
  ipcMain.handle('rta:generate', async (_event, data: Record<string, unknown>) => {
    try {
      const output = await rtaService.preencherRtaAndSave(data || {});
      return createSuccess({ output });
    } catch (error) {
      console.error('Erro no RTA:', error);
      return createError(error);
    }
  });
}
