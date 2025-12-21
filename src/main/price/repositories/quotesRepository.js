const fs = require('fs');
const path = require('path');
const PathResolverModule = require('../../automation/utils/path-resolver');
const PathResolver = PathResolverModule.default || PathResolverModule;

const {
  listQuotes,
  getQuoteById,
  upsertQuoteRecord,
  deleteQuoteById
} = require('../../infra/db/quotes-repository');

const LEGACY_QUOTES_FILE = path.join(PathResolver.getUserDataDir(), 'price', 'quotes.json');

class QuotesRepository {
  constructor() {
    this._migrateLegacyFile();
  }

  list() {
    return listQuotes();
  }

  get(id) {
    return getQuoteById(id);
  }

  upsert(entry) {
    if (!entry || !entry.id) {
      throw new Error('Cotação inválida para salvar.');
    }

    const id = String(entry.id).trim();
    if (!id) {
      throw new Error('Cotação inválida para salvar.');
    }

    return upsertQuoteRecord({
      id,
      nome: entry.nome || entry.name || 'Sem nome',
      documento: entry.documento || entry.document || '',
      payload: entry.payload || entry.data || {},
      trelloCardId: entry.trelloCardId || entry.trello_card_id || entry.cardId || id,
      trelloCardUrl: entry.trelloCardUrl || entry.trello_card_url || entry.cardUrl || ''
    });
  }

  saveFromTrello(formData, card) {
    if (!card || !card.id) {
      throw new Error('Card do Trello inválido para salvar a cotação.');
    }

    const payload = this._sanitizePayload(formData);
    return this.upsert({
      id: card.id,
      nome: formData?.nome || card.name || 'Sem nome',
      documento: formData?.documento || '',
      payload,
      trelloCardId: card.id,
      trelloCardUrl: card.url || ''
    });
  }

  delete(id) {
    const key = String(id || '').trim();
    if (!key) {
      throw new Error('ID inválido para exclusão de cotação.');
    }
    return deleteQuoteById(key);
  }

  _sanitizePayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return {};
    }

    const sanitized = { ...payload };
    if ('attachments' in sanitized) {
      delete sanitized.attachments;
    }
    if ('anexos' in sanitized) {
      delete sanitized.anexos;
    }

    return sanitized;
  }

  _migrateLegacyFile() {
    if (!fs.existsSync(LEGACY_QUOTES_FILE)) {
      return;
    }

    try {
      const raw = fs.readFileSync(LEGACY_QUOTES_FILE, 'utf8');
      const data = JSON.parse(raw);

      if (Array.isArray(data)) {
        data.forEach((item) => {
          const id = String(item?.id || item?.identifier || '').trim();
          if (!id) {
            return;
          }

          this.upsert({
            id,
            nome: item?.nome || item?.name || 'Sem nome',
            documento: item?.documento || item?.document || '',
            trelloCardId: item?.trelloCardId || item?.trello_card_id || item?.cardId || id,
            trelloCardUrl: item?.trelloCardUrl || item?.trello_card_url || ''
          });
        });
      }

      const backupPath = `${LEGACY_QUOTES_FILE}.bak`;
      try {
        fs.renameSync(LEGACY_QUOTES_FILE, backupPath);
      } catch (_) {
        try {
          fs.unlinkSync(LEGACY_QUOTES_FILE);
        } catch (_) {}
      }

      console.log('[QuotesRepository] Cotações legacy migradas para o banco de dados.');
    } catch (error) {
      console.warn('[QuotesRepository] Falha ao migrar cotações legacy:', error.message);
    }
  }
}

module.exports = new QuotesRepository();
