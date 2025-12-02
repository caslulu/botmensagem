const { ipcMain } = require('electron');
const trelloService = require('../trello/services/trelloService');
const quotesRepository = require('../price/repositories/quotesRepository');
const { createSuccess, createError } = require('../utils/result');

const VIN_DECODE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/';

function registerTrelloHandlers() {
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

  ipcMain.handle('trello:create-card', async (_event, data) => {
    try {
      const card = await trelloService.createTrelloCard(data || {});
      try {
        quotesRepository.saveFromTrello(data || {}, card);
      } catch (repoError) {
        console.warn('Falha ao salvar cotação no banco de dados:', repoError.message);
      }
      return createSuccess({ card });
    } catch (error) {
      return createError(error);
    }
  });

  ipcMain.handle('trello:decode-vin', async (_event, vin) => {
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
}

async function fetchVinInfo(vin) {
  const url = `${VIN_DECODE_URL}${encodeURIComponent(vin)}?format=json`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Falha ao consultar o VIN.');
  }

  const payload = await response.json();
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

module.exports = { registerTrelloHandlers };
