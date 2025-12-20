import fs from 'fs';
import path from 'path';
import PathResolver from '../../automation/utils/path-resolver';
import { deleteQuoteById, getQuoteById, listQuotes, upsertQuoteRecord } from '../../infra/db/quotes-repository';
import type { Quote } from '../../infra/db/quotes-repository';

type UpsertInput = {
  id: string;
  nome?: string;
  name?: string;
  documento?: string;
  document?: string;
  payload?: Record<string, unknown>;
  data?: Record<string, unknown>;
  trelloCardId?: string;
  trello_card_id?: string;
  cardId?: string;
  trelloCardUrl?: string;
  trello_card_url?: string;
  cardUrl?: string;
};

type TrelloCard = { id: string; name?: string; url?: string };

const LEGACY_QUOTES_FILE = path.join(PathResolver.getUserDataDir(), 'price', 'quotes.json');

class QuotesRepository {
  constructor() {
    this._migrateLegacyFile();
  }

  list(): Quote[] {
    return listQuotes();
  }

  get(id: string): Quote | null {
    return getQuoteById(id);
  }

  upsert(entry: UpsertInput): Quote {
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
      payload: (entry.payload || entry.data || {}) as Record<string, unknown>,
      trelloCardId: entry.trelloCardId || entry.trello_card_id || entry.cardId || id,
      trelloCardUrl: entry.trelloCardUrl || entry.trello_card_url || entry.cardUrl || ''
    });
  }

  saveFromTrello(formData: Record<string, unknown> | undefined, card: TrelloCard): Quote {
    if (!card || !card.id) {
      throw new Error('Card do Trello inválido para salvar a cotação.');
    }

    const payload = this._sanitizePayload(formData);
    return this.upsert({
      id: card.id,
      nome: (formData as any)?.nome || card.name || 'Sem nome',
      documento: (formData as any)?.documento || '',
      payload,
      trelloCardId: card.id,
      trelloCardUrl: card.url || ''
    });
  }

  delete(id: string): boolean {
    const key = String(id || '').trim();
    if (!key) {
      throw new Error('ID inválido para exclusão de cotação.');
    }
    return deleteQuoteById(key);
  }

  private _sanitizePayload(payload: Record<string, unknown> | undefined): Record<string, unknown> {
    if (!payload || typeof payload !== 'object') {
      return {};
    }

    const sanitized = { ...payload } as Record<string, unknown>;
    if ('attachments' in sanitized) {
      delete (sanitized as any).attachments;
    }
    if ('anexos' in sanitized) {
      delete (sanitized as any).anexos;
    }

    return sanitized;
  }

  private _migrateLegacyFile(): void {
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
        } catch (_) {
          // ignore
        }
      }

      console.log('[QuotesRepository] Cotações legacy migradas para o banco de dados.');
    } catch (error) {
      console.warn('[QuotesRepository] Falha ao migrar cotações legacy:', (error as Error).message);
    }
  }
}

const quotesRepository = new QuotesRepository();
export default quotesRepository;
// CommonJS compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(module as any).exports = quotesRepository;
