import { ipcMain } from 'electron';
import priceService from '../price/services/priceService';
import quotesRepository from '../price/repositories/quotesRepository';
import { createSuccess, createError } from '../utils/result';

export function registerPriceHandlers(): void {
  ipcMain.handle('price:list-quotes', async () => {
    try {
      return createSuccess({ quotes: priceService.getQuotes() });
    } catch (error) {
      return createError(error);
    }
  });

  ipcMain.handle('price:get-quote', async (_event, id: string | number | undefined) => {
    try {
      const quote = quotesRepository.get(String(id ?? ''));
      return createSuccess({ quote });
    } catch (error) {
      return createError(error);
    }
  });

  ipcMain.handle('price:delete-quote', async (_event, id: string | number | undefined) => {
    try {
      const ok = quotesRepository.delete(String(id ?? ''));
      return createSuccess({ deleted: Boolean(ok) });
    } catch (error) {
      return createError(error);
    }
  });

  ipcMain.handle('price:upsert-quote', async (_event, entry: Record<string, unknown>) => {
    try {
      const payload = (entry || {}) as { id?: string | number } & Record<string, unknown>;
      if (!payload.id) {
        throw new Error('ID da cotação é obrigatório.');
      }
      const saved = quotesRepository.upsert({ ...payload, id: String(payload.id) });
      return createSuccess({ quote: saved });
    } catch (error) {
      return createError(error);
    }
  });

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
