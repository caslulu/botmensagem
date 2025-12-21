import { ipcMain } from 'electron';
import { createSuccess, createError } from '../utils/result';
import quoteAutomation from '../automation/quotes';

export function registerQuoteHandlers(): void {
  ipcMain.handle('quotes:run-automation', async (_event, payload: Record<string, unknown>) => {
    try {
      const result = await quoteAutomation.runAutomation(payload || {});
      return createSuccess({ result });
    } catch (error) {
      console.error('[IPC][quotes:run-automation]', error);
      return createError(error);
    }
  });
}
