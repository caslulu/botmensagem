const { getDb, saveDatabase, parseJsonSafe } = require('./sqlite');

function normalizeQuoteRow(row) {
  if (!row) return null;
  const payload = parseJsonSafe(row.payload, {});
  return {
    id: row.id,
    nome: row.nome || '',
    documento: row.documento || '',
    payload,
    trelloCardId: row.trello_card_id || row.id || '',
    trelloCardUrl: row.trello_card_url || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getQuoteById(id) {
  const db = getDb();
  if (!id) return null;

  const stmt = db.prepare(`
    SELECT id, nome, documento, payload, trello_card_id, trello_card_url, created_at, updated_at
    FROM quotes
    WHERE id = ?
    LIMIT 1
  `);
  stmt.bind([id]);

  let quote = null;
  if (stmt.step()) {
    quote = normalizeQuoteRow(stmt.getAsObject());
  }
  stmt.free();
  return quote;
}

function listQuotes() {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, nome, documento, payload, trello_card_id, trello_card_url, created_at, updated_at
    FROM quotes
    ORDER BY datetime(created_at) DESC, datetime(updated_at) DESC
  `);

  const items = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    const normalized = normalizeQuoteRow(row);
    if (normalized) items.push(normalized);
  }
  stmt.free();
  return items;
}

function upsertQuoteRecord(quote) {
  const db = getDb();
  if (!quote || !quote.id) {
    throw new Error('Cotação inválida');
  }

  const nome = quote.nome || '';
  const documento = quote.documento || '';
  const trelloCardId = quote.trelloCardId || quote.id;
  const trelloCardUrl = quote.trelloCardUrl || '';
  const payloadJson = JSON.stringify(quote.payload || {});

  const existsStmt = db.prepare('SELECT id FROM quotes WHERE id = ? LIMIT 1');
  existsStmt.bind([quote.id]);
  const exists = existsStmt.step();
  existsStmt.free();

  if (exists) {
    const updateStmt = db.prepare(`
      UPDATE quotes
      SET nome = ?, documento = ?, payload = ?, trello_card_id = ?, trello_card_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    updateStmt.bind([nome, documento, payloadJson, trelloCardId, trelloCardUrl, quote.id]);
    updateStmt.step();
    updateStmt.free();
  } else {
    const insertStmt = db.prepare(`
      INSERT INTO quotes (id, nome, documento, payload, trello_card_id, trello_card_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertStmt.bind([quote.id, nome, documento, payloadJson, trelloCardId, trelloCardUrl]);
    insertStmt.step();
    insertStmt.free();
  }

  saveDatabase();
  return getQuoteById(quote.id);
}

function deleteQuoteById(id) {
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

module.exports = {
  getQuoteById,
  listQuotes,
  upsertQuoteRecord,
  deleteQuoteById
};
