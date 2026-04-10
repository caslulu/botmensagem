import { ipcMain } from 'electron';
import trelloService from '../trello/services/trelloService';
import quotesRepository from '../price/repositories/quotesRepository';
import { createSuccess, createError } from '../utils/result';

const VIN_DECODE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/';

export function registerTrelloHandlers(): void {
  ipcMain.handle('trello:auth-check', async () => {
    try {
      const ok = await trelloService.trelloAuthCheck();
      if (!ok) {
        return createError('Não autenticado', { authenticated: false });
      }
      return createSuccess({ authenticated: true });
    } catch (error) {
      return createError(error, { authenticated: false });
    }
  });

  ipcMain.handle('trello:create-card', async (_event, data: Record<string, unknown>) => {
    try {
      const card = await trelloService.createTrelloCard(data || {});
      try {
        quotesRepository.saveFromTrello(data || {}, card);
      } catch (repoError: any) {
        console.warn('Falha ao salvar cotação no banco de dados:', repoError?.message);
      }
      return createSuccess({ card });
    } catch (error) {
      return createError(error);
    }
  });

  ipcMain.handle('trello:decode-vin', async (_event, vin: string) => {
    const sanitized = typeof vin === 'string'
      ? vin.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
      : '';

    if (sanitized.length < 11) {
      return createError('VIN inválido.', { data: null });
    }

    try {
      const data = await fetchVinInfo(sanitized);
      if (!data) {
        return createError('Não foi possível decodificar o VIN.', { data: null });
      }
      return createSuccess({ data });
    } catch (error) {
      return createError(error, { data: null });
    }
  });

  ipcMain.handle('trello:get-list-cards', async (_event, payload: Record<string, unknown>) => {
    try {
      const result = await trelloService.getListCards({
        boardRef: typeof payload?.boardRef === 'string' ? payload.boardRef : typeof payload?.boardUrl === 'string' ? payload.boardUrl : '',
        listId: typeof payload?.listId === 'string' ? payload.listId : '',
        listName: typeof payload?.listName === 'string' ? payload.listName : ''
      });
      return createSuccess(result);
    } catch (error) {
      return createError(error, { cards: [] });
    }
  });

  ipcMain.handle('trello:delete-card', async (_event, cardId: string) => {
    try {
      const deleted = await trelloService.deleteCard(cardId);
      return createSuccess({ deleted });
    } catch (error) {
      return createError(error, { deleted: false });
    }
  });
}

async function fetchVinInfo(vin: string): Promise<{ year: string; make: string; model: string } | null> {
  const url = `${VIN_DECODE_URL}${encodeURIComponent(vin)}?format=json`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Falha ao consultar o VIN.');
  }

  const payload: any = await response.json();
  const row = payload?.Results?.[0] || {};
  const normalized = {
    year: row?.ModelYear || row?.Model_Year || '',
    make: row?.Make || '',
    model: row?.Model || ''
  };

  if (!normalized.year && !normalized.make && !normalized.model) {
    return null;
  }

  return normalized;
}

export { fetchVinInfo };
