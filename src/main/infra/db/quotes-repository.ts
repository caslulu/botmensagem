import { getDb, saveDatabase, parseJsonSafe } from './sqlite';

export type QuoteRecord = {
  id: string;
  nome: string;
  documento: string;
  payload: string;
  created_at?: string;
  updated_at?: string;
};

export type Quote = {
  id: string;
  nome: string;
  documento: string;
  payload: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

function normalizeQuoteRow(row: QuoteRecord | null): Quote | null {
  if (!row) return null;
  const payload = parseJsonSafe<Record<string, unknown>>(row.payload, {});
  return {
    id: row.id,
    nome: row.nome || '',
    documento: row.documento || '',
    payload,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function getQuoteById(id: string): Quote | null {
  const db = getDb();
  if (!id) return null;

  const stmt = db.prepare(
    `
    SELECT id, nome, documento, payload, created_at, updated_at
    FROM quotes
    WHERE id = ?
    LIMIT 1
  `
  );
  stmt.bind([id]);

  let quote: Quote | null = null;
  if (stmt.step()) {
    quote = normalizeQuoteRow(stmt.getAsObject() as QuoteRecord);
  }
  stmt.free();
  return quote;
}

export function listQuotes(): Quote[] {
  const db = getDb();
  const stmt = db.prepare(
    `
    SELECT id, nome, documento, payload, created_at, updated_at
    FROM quotes
    ORDER BY datetime(created_at) DESC, datetime(updated_at) DESC
  `
  );

  const items: Quote[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as QuoteRecord;
    const normalized = normalizeQuoteRow(row);
    if (normalized) items.push(normalized);
  }
  stmt.free();
  return items;
}

type UpsertQuoteInput = {
  id: string;
  nome?: string;
  documento?: string;
  payload?: Record<string, unknown>;
};

export function upsertQuoteRecord(quote: UpsertQuoteInput): Quote {
  const db = getDb();
  if (!quote || !quote.id) {
    throw new Error('Cotação inválida');
  }

  const nome = quote.nome || '';
  const documento = quote.documento || '';
  const payloadJson = JSON.stringify(quote.payload || {});

  const existsStmt = db.prepare('SELECT id FROM quotes WHERE id = ? LIMIT 1');
  existsStmt.bind([quote.id]);
  const exists = existsStmt.step();
  existsStmt.free();

  if (exists) {
    const updateStmt = db.prepare(
      `
      UPDATE quotes
      SET nome = ?, documento = ?, payload = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    );
    updateStmt.bind([nome, documento, payloadJson, quote.id]);
    updateStmt.step();
    updateStmt.free();
  } else {
    const insertStmt = db.prepare(
      `
      INSERT INTO quotes (id, nome, documento, payload)
      VALUES (?, ?, ?, ?)
    `
    );
    insertStmt.bind([quote.id, nome, documento, payloadJson]);
    insertStmt.step();
    insertStmt.free();
  }

  saveDatabase();
  const saved = getQuoteById(quote.id);
  if (!saved) {
    throw new Error('Falha ao salvar cotação');
  }
  return saved;
}

export function deleteQuoteById(id: string): boolean {
  const db = getDb();
  if (!id) return false;

  const getStmt = db.prepare('SELECT id FROM quotes WHERE id = ? LIMIT 1');
  getStmt.bind([id]);
  const exists = getStmt.step();
  getStmt.free();

  if (!exists) return false;

  const delStmt = db.prepare('DELETE FROM quotes WHERE id = ?');
  delStmt.bind([id]);
  delStmt.step();
  delStmt.free();

  saveDatabase();
  return true;
}
