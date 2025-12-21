const { getDb, saveDatabase } = require('./sqlite');
const { randomUUID } = require('crypto');

const seedItems = [
  {
    title: 'Novos provedores de cotação',
    description: 'Adicionar Allstate e Geico com login seguro e preenchimento guiado.',
    eta: 'Fev 2026',
    label: 'Cotações',
    risk: 'Dependência de captchas das seguradoras',
    status: 'todo'
  },
  {
    title: 'Alertas proativos',
    description: 'Avisos de expiração de sessão e lembretes de tarefas em aberto.',
    eta: 'Fev 2026',
    label: 'Produtividade',
    status: 'todo'
  },
  {
    title: 'Biblioteca de guias rápidos',
    description: 'Passos curtos filtrados por módulo, com busca e tags.',
    eta: 'Mar 2026',
    label: 'Educação',
    status: 'todo'
  },
  {
    title: 'Templates de preço otimizados',
    description: 'Ajustes de layout e qualidade de imagem para diferentes seguradoras.',
    eta: 'Jan 2026',
    label: 'Preço',
    risk: 'Depende da validação visual dos clientes',
    status: 'doing'
  },
  {
    title: 'Monitoramento de automações',
    description: 'Logs amigáveis com avisos e instruções de correção.',
    eta: 'Jan 2026',
    label: 'Confiabilidade',
    status: 'doing'
  },
  {
    title: 'Painel de novidades',
    description: 'Tela dedicada para comunicar releases com imagens e passos rápidos.',
    eta: 'Dez 2025',
    label: 'UX',
    status: 'done'
  },
  {
    title: 'Roadmap em kanban',
    description: 'Quadro visível para clientes com status e estimativas.',
    eta: 'Dez 2025',
    label: 'Transparência',
    status: 'done'
  }
];

let seededRoadmap = false;

function nextPosition(db, status) {
  const stmt = db.prepare('SELECT MAX(position) as maxPos FROM roadmap_items WHERE status = ?');
  stmt.bind([status]);
  let maxPos = 0;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    maxPos = Number(row.maxPos || 0);
  }
  stmt.free();
  return maxPos + 1;
}

function normalize(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    eta: row.eta || '',
    label: row.label || 'Feature',
    risk: row.risk || undefined,
    status: row.status,
    position: Number(row.position || 0),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function seedIfEmpty() {
  if (seededRoadmap) return;
  const db = getDb();
  const countStmt = db.prepare('SELECT COUNT(1) as total FROM roadmap_items');
  let total = 0;
  if (countStmt.step()) {
    const row = countStmt.getAsObject();
    total = Number(row.total || 0);
  }
  countStmt.free();
  if (total > 0) {
    seededRoadmap = true;
    return;
  }

  seedItems.forEach((item) => {
    const id = randomUUID();
    const position = nextPosition(db, item.status);
    const insert = db.prepare(
      'INSERT INTO roadmap_items (id, title, description, eta, label, risk, status, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insert.bind([id, item.title, item.description, item.eta, item.label, item.risk || null, item.status, position]);
    insert.step();
    insert.free();
  });
  saveDatabase();
  seededRoadmap = true;
}

function listRoadmapItems() {
  const db = getDb();
  seedIfEmpty();
  const stmt = db.prepare(
    'SELECT id, title, description, eta, label, risk, status, position, created_at, updated_at FROM roadmap_items ORDER BY status, position, datetime(created_at) DESC'
  );
  const items = [];
  while (stmt.step()) {
    items.push(normalize(stmt.getAsObject()));
  }
  stmt.free();
  return items;
}

function createRoadmapItem(payload) {
  const db = getDb();
  const id = randomUUID();
  const status = payload.status || 'todo';
  const position = nextPosition(db, status);
  const insert = db.prepare(
    'INSERT INTO roadmap_items (id, title, description, eta, label, risk, status, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  insert.bind([
    id,
    (payload.title || '').trim(),
    (payload.description || '').trim(),
    (payload.eta || 'Data pendente').trim(),
    (payload.label || 'Feature').trim(),
    (payload.risk || '').trim() || null,
    status,
    position
  ]);
  insert.step();
  insert.free();
  saveDatabase();

  const stmt = db.prepare(
    'SELECT id, title, description, eta, label, risk, status, position, created_at, updated_at FROM roadmap_items WHERE id = ? LIMIT 1'
  );
  stmt.bind([id]);
  let item = null;
  if (stmt.step()) {
    item = normalize(stmt.getAsObject());
  }
  stmt.free();
  if (!item) throw new Error('Falha ao criar item do roadmap');
  return item;
}

function updateRoadmapStatus(id, status) {
  if (!id) return null;
  const db = getDb();
  const position = nextPosition(db, status);
  const update = db.prepare('UPDATE roadmap_items SET status = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  update.bind([status, position, id]);
  update.step();
  update.free();
  saveDatabase();

  const stmt = db.prepare(
    'SELECT id, title, description, eta, label, risk, status, position, created_at, updated_at FROM roadmap_items WHERE id = ? LIMIT 1'
  );
  stmt.bind([id]);
  let item = null;
  if (stmt.step()) {
    item = normalize(stmt.getAsObject());
  }
  stmt.free();
  return item;
}

function updateRoadmapItem(id, payload) {
  if (!id) return null;
  const db = getDb();

  const check = db.prepare('SELECT id FROM roadmap_items WHERE id = ? LIMIT 1');
  check.bind([id]);
  const exists = check.step();
  check.free();
  if (!exists) return null;

  const { title, description, eta, label, risk, status } = payload || {};
  const update = db.prepare(
    'UPDATE roadmap_items SET title = COALESCE(?, title), description = COALESCE(?, description), eta = COALESCE(?, eta), label = COALESCE(?, label), risk = ?, status = COALESCE(?, status), updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  );
  update.bind([
    title ?? null,
    description ?? null,
    eta ?? null,
    label ?? null,
    (risk ?? '').trim() || null,
    status ?? null,
    id
  ]);
  update.step();
  update.free();
  saveDatabase();

  const stmt = db.prepare(
    'SELECT id, title, description, eta, label, risk, status, position, created_at, updated_at FROM roadmap_items WHERE id = ? LIMIT 1'
  );
  stmt.bind([id]);
  let item = null;
  if (stmt.step()) {
    item = normalize(stmt.getAsObject());
  }
  stmt.free();
  return item;
}

function deleteRoadmapItem(id) {
  if (!id) return false;
  const db = getDb();
  const del = db.prepare('DELETE FROM roadmap_items WHERE id = ?');
  del.bind([id]);
  del.step();
  const modified = db.getRowsModified();
  del.free();
  if (modified > 0) {
    saveDatabase();
    return true;
  }
  return false;
}

module.exports = {
  listRoadmapItems,
  createRoadmapItem,
  updateRoadmapStatus,
  updateRoadmapItem,
  deleteRoadmapItem
};
