import initSqlJs, { type Database as SqlDatabase, type SqlJsStatic } from 'sql.js';
import path from 'path';
import fs from 'fs';
import PathResolver from '../../automation/utils/path-resolver';

export const DB_DIR = PathResolver.getUserDataDir();
export const DB_PATH = path.join(DB_DIR, 'messages.db');

let SQL: SqlJsStatic | null = null;
let db: SqlDatabase | null = null;

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export async function initDatabase(): Promise<SqlDatabase> {
  if (db) return db;

  SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  createSchema();
  ensureProfilesAdminColumn();
  saveDatabase();
  console.log('✓ Banco de dados inicializado');
  return db;
}

function createSchema(): void {
  if (!db) return;

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id TEXT NOT NULL,
      text TEXT NOT NULL,
      image_path TEXT,
      is_selected INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS profile_settings (
      profile_id TEXT PRIMARY KEY,
      send_limit INTEGER DEFAULT 200,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      image_path TEXT NOT NULL,
      default_message TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS profile_sessions (
      profile_id TEXT PRIMARY KEY,
      session_dir TEXT NOT NULL,
      last_used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      nome TEXT,
      documento TEXT,
      payload TEXT,
      trello_card_id TEXT,
      trello_card_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_profile_id ON messages(profile_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at)');
}

function ensureProfilesAdminColumn(): void {
  if (!db) return;
  try {
    const stmt = db.prepare('PRAGMA table_info(profiles)');
    let hasAdminColumn = false;
    while (stmt.step()) {
      const column = stmt.getAsObject();
      if (column.name === 'is_admin') {
        hasAdminColumn = true;
        break;
      }
    }
    stmt.free();

    if (!hasAdminColumn) {
      db.run('ALTER TABLE profiles ADD COLUMN is_admin INTEGER DEFAULT 0');
      console.log('✓ Coluna is_admin adicionada à tabela profiles');
    }
  } catch (error) {
    console.error('Erro ao garantir coluna is_admin na tabela profiles', error);
  }
}

export function getDb(): SqlDatabase {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export function saveDatabase(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export function parseJsonSafe<T>(value: unknown, fallback: T): T {
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch (_) {
    return fallback;
  }
}
