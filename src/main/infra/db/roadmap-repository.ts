import { getDb, saveDatabase } from './sqlite';
import { randomUUID } from 'crypto';

export type RoadmapStatus = 'todo' | 'doing' | 'done';

export type RoadmapItem = {
  id: string;
  title: string;
  description: string;
  eta: string;
  label: string;
  risk?: string;
  status: RoadmapStatus;
  position: number;
  created_at?: string;
  updated_at?: string;
};

const seedItems: Omit<RoadmapItem, 'id' | 'position'>[] = [
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

function nextPosition(db: any, status: RoadmapStatus): number {
  const stmt = db.prepare('SELECT MAX(position) as maxPos FROM roadmap_items WHERE status = ?');
  stmt.bind([status]);
  let maxPos = 0;
  if (stmt.step()) {
    const row = stmt.getAsObject() as { maxPos?: number };
    maxPos = Number(row.maxPos || 0);
  }
  stmt.free();
  return maxPos + 1;
}

function normalize(row: any): RoadmapItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    eta: row.eta || '',
    label: row.label || 'Feature',
    risk: row.risk || undefined,
    status: row.status as RoadmapStatus,
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
    const row = countStmt.getAsObject() as { total?: number };
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

export function listRoadmapItems(): RoadmapItem[] {
  const db = getDb();
  seedIfEmpty();
  const stmt = db.prepare(
    'SELECT id, title, description, eta, label, risk, status, position, created_at, updated_at FROM roadmap_items ORDER BY status, position, datetime(created_at) DESC'
  );

  const items: RoadmapItem[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    items.push(normalize(row));
  }
  stmt.free();
  return items;
}

export type CreateRoadmapInput = {
  title: string;
  description?: string;
  eta?: string;
  label?: string;
  risk?: string;
  status?: RoadmapStatus;
};

export function createRoadmapItem(payload: CreateRoadmapInput): RoadmapItem {
  const db = getDb();
  const id = randomUUID();
  const status: RoadmapStatus = (payload.status as RoadmapStatus) || 'todo';
  const position = nextPosition(db, status);

  const insert = db.prepare(
    'INSERT INTO roadmap_items (id, title, description, eta, label, risk, status, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  insert.bind([
    id,
    payload.title.trim(),
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
  let item: RoadmapItem | null = null;
  if (stmt.step()) {
    item = normalize(stmt.getAsObject());
  }
  stmt.free();
  if (!item) throw new Error('Falha ao criar item do roadmap');
  return item;
}

export function updateRoadmapStatus(id: string, status: RoadmapStatus): RoadmapItem | null {
  if (!id) return null;
  const db = getDb();
  const position = nextPosition(db, status);

  const update = db.prepare(
    'UPDATE roadmap_items SET status = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  );
  update.bind([status, position, id]);
  update.step();
  update.free();
  saveDatabase();

  const stmt = db.prepare(
    'SELECT id, title, description, eta, label, risk, status, position, created_at, updated_at FROM roadmap_items WHERE id = ? LIMIT 1'
  );
  stmt.bind([id]);
  let item: RoadmapItem | null = null;
  if (stmt.step()) {
    item = normalize(stmt.getAsObject());
  }
  stmt.free();
  return item;
}

export function updateRoadmapItem(id: string, payload: Partial<Omit<RoadmapItem, 'id' | 'created_at' | 'updated_at'>>) {
  if (!id) return null;
  const db = getDb();

  const stmtCheck = db.prepare('SELECT id FROM roadmap_items WHERE id = ? LIMIT 1');
  stmtCheck.bind([id]);
  const exists = stmtCheck.step();
  stmtCheck.free();
  if (!exists) return null;

  const { title, description, eta, label, risk, status } = payload;
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
  let item: RoadmapItem | null = null;
  if (stmt.step()) {
    item = normalize(stmt.getAsObject());
  }
  stmt.free();
  return item;
}

export function deleteRoadmapItem(id: string): boolean {
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
