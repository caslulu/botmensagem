import { ipcMain } from 'electron';
import priceService from '../price/services/priceService';
import { createSuccess, createError } from '../utils/result';

export function registerPriceHandlers(): void {
  ipcMain.handle('price:generate', async (_event, payload: Record<string, unknown>) => {
    try {
      const options = (payload || {}) as any; // runtime validation handled inside service
      const result = await priceService.generate(options);
      return createSuccess({ result });
    } catch (error) {
      console.error('Erro ao gerar preço automático:', error);
      return createError(error);
    }
  });
}
