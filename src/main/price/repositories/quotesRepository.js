const fs = require('fs');
const path = require('path');
const PathResolver = require('../../automation/utils/path-resolver');

const DEFAULT_QUOTES = [];

class QuotesRepository {
  constructor() {
    this.baseDir = path.join(PathResolver.getUserDataDir(), 'price');
    this.quotesPath = path.join(this.baseDir, 'quotes.json');
    this._ensureStorage();
  }

  _ensureStorage() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }

    if (!fs.existsSync(this.quotesPath)) {
      fs.writeFileSync(this.quotesPath, JSON.stringify(DEFAULT_QUOTES, null, 2), 'utf8');
    }
  }

  _readFile() {
    this._ensureStorage();
    try {
      const raw = fs.readFileSync(this.quotesPath, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        return data.map((item) => ({
          id: String(item.id || item.identifier || '').trim(),
          nome: item.nome || item.name || 'Sem nome',
          documento: item.documento || item.document || '',
          trelloCardId: item.trelloCardId || item.trello_card_id || item.cardId || null
        })).filter((item) => item.id);
      }
      return [];
    } catch (error) {
      console.warn('[QuotesRepository] Falha ao ler quotes.json, recriando arquivo.', error.message);
      fs.writeFileSync(this.quotesPath, JSON.stringify(DEFAULT_QUOTES, null, 2), 'utf8');
      return [...DEFAULT_QUOTES];
    }
  }

  _writeFile(data) {
    this._ensureStorage();
    fs.writeFileSync(this.quotesPath, JSON.stringify(data, null, 2), 'utf8');
  }

  list() {
    return this._readFile();
  }

  upsert(entry) {
    if (!entry || !entry.id) {
      throw new Error('Cotação inválida para salvar.');
    }

    const current = this._readFile();
    const idx = current.findIndex((item) => item.id === entry.id);
    const normalized = {
      id: String(entry.id).trim(),
      nome: entry.nome || entry.name || 'Sem nome',
      documento: entry.documento || entry.document || '',
      trelloCardId: entry.trelloCardId || entry.trello_card_id || null
    };

    if (idx >= 0) {
      current[idx] = normalized;
    } else {
      current.push(normalized);
    }

    this._writeFile(current);
    return normalized;
  }
}

module.exports = new QuotesRepository();
