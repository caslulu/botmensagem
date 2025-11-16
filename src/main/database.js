const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const PathResolver = require('./automation/utils/path-resolver');
const { DEFAULT_AVATAR_TOKEN } = require('./constants/profile');

const MAX_PROFILES = 5;

// Usar diretório de dados consistente (Electron userData ou ./data)
const DB_DIR = PathResolver.getUserDataDir();
const DB_PATH = path.join(DB_DIR, 'messages.db');

let db = null;

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize database
async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  
  // Create tables
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

  // Profile settings table
  db.run(`
    CREATE TABLE IF NOT EXISTS profile_settings (
      profile_id TEXT PRIMARY KEY,
      send_limit INTEGER DEFAULT 200,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Profiles table (stores core profile data)
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

  // Profile sessions table (stores session directory info)
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

  // Create index for faster queries
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_profile_id ON messages(profile_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at)
  `);
  
  // Garantir colunas opcionais mais recentes
  ensureProfilesAdminColumn();

  // Migrar diretórios de sessão antigos antes de qualquer seed
  migrateSessionDirs();

  // Save database to disk
  saveDatabase();
  
  console.log('✓ Banco de dados inicializado');
}

// Save database to disk
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function parseJsonSafe(value, fallback = {}) {
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

function ensureProfilesAdminColumn() {
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

    // Garantir que perfis padrão estejam como admin
    db.run("UPDATE profiles SET is_admin = 1 WHERE id IN ('thiago','debora')");
    saveDatabase();
  } catch (error) {
    console.error('Erro ao garantir coluna is_admin na tabela profiles', error);
  }
}

function getProfileCount() {
  if (!db) return 0;
  const stmt = db.prepare('SELECT COUNT(*) as count FROM profiles');
  stmt.step();
  const { count } = stmt.getAsObject();
  stmt.free();
  return count;
}

function createProfile(profile) {
  if (!db) throw new Error('Database not initialized');

  if (!profile) {
    throw new Error('Perfil inválido');
  }

  const id = profile.id;
  const name = profile.name;
  let imagePath = profile.imagePath || profile.image_path;
  const defaultMessage = profile.defaultMessage || profile.default_message || '';
  const isAdmin = profile.isAdmin ?? profile.is_admin ?? false;

  if (!id || !name) {
    throw new Error('Perfil inválido: id e nome são obrigatórios');
  }

  if (!imagePath) {
    imagePath = DEFAULT_AVATAR_TOKEN;
  }

  if (imagePath !== DEFAULT_AVATAR_TOKEN && !fs.existsSync(imagePath)) {
    throw new Error('Perfil inválido: caminho da imagem não encontrado');
  }

  // Mensagem padrão não é obrigatória; perfis podem ser criados sem mensagem

  if (getProfileCount() >= MAX_PROFILES) {
    throw new Error(`Limite máximo de ${MAX_PROFILES} perfis atingido`);
  }

  const existing = getProfileById(id);
  if (existing) {
    throw new Error(`Perfil ${id} já existe`);
  }

  const insertProfileStmt = db.prepare(`
    INSERT INTO profiles (id, name, image_path, default_message, is_admin)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertProfileStmt.bind([id, name, imagePath, defaultMessage, isAdmin ? 1 : 0]);
  insertProfileStmt.step();
  insertProfileStmt.free();

  const sessionDir = PathResolver.getProfileSessionDir(id);
  fs.mkdirSync(sessionDir, { recursive: true });

  const insertSessionStmt = db.prepare(`
    INSERT INTO profile_sessions (profile_id, session_dir)
    VALUES (?, ?)
  `);
  insertSessionStmt.bind([id, sessionDir]);
  insertSessionStmt.step();
  insertSessionStmt.free();

  saveDatabase();
  return getProfileById(id);
}

// Get all messages for a profile
function getMessages(profileId) {
  if (!db) return [];
  
  const stmt = db.prepare(`
    SELECT * FROM messages 
    WHERE profile_id = ? 
    ORDER BY created_at ASC
  `);
  stmt.bind([profileId]);
  
  const messages = [];
  while (stmt.step()) {
    messages.push(stmt.getAsObject());
  }
  stmt.free();
  
  return messages;
}

// Get selected message for a profile
function getSelectedMessage(profileId) {
  if (!db) return null;
  
  const stmt = db.prepare(`
    SELECT * FROM messages 
    WHERE profile_id = ? AND is_selected = 1 
    LIMIT 1
  `);
  stmt.bind([profileId]);
  
  let message = null;
  if (stmt.step()) {
    message = stmt.getAsObject();
  }
  stmt.free();
  
  return message;
}

// Add a new message
function addMessage(profileId, text, imagePath = null) {
  if (!db) throw new Error('Database not initialized');
  
  // Get message count for this profile
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM messages WHERE profile_id = ?');
  countStmt.bind([profileId]);
  countStmt.step();
  const { count } = countStmt.getAsObject();
  countStmt.free();
  
  if (count >= 5) {
    throw new Error('Limite máximo de 5 mensagens por perfil atingido');
  }
  
  // If this is the first message, set it as selected
  const isSelected = count === 0 ? 1 : 0;
  
  const stmt = db.prepare(`
    INSERT INTO messages (profile_id, text, image_path, is_selected)
    VALUES (?, ?, ?, ?)
  `);
  stmt.bind([profileId, text, imagePath, isSelected]);
  stmt.step();
  stmt.free();
  
  saveDatabase();
  
  // Get the last inserted row id
  const lastIdStmt = db.prepare('SELECT last_insert_rowid() as id');
  lastIdStmt.step();
  const { id } = lastIdStmt.getAsObject();
  lastIdStmt.free();
  
  return id;
}

// Update a message
function updateMessage(messageId, text, imagePath = null) {
  if (!db) throw new Error('Database not initialized');
  
  const stmt = db.prepare(`
    UPDATE messages 
    SET text = ?, image_path = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.bind([text, imagePath, messageId]);
  stmt.step();
  stmt.free();
  
  saveDatabase();
  
  return true;
}

// Delete a message
function deleteMessage(messageId) {
  if (!db) throw new Error('Database not initialized');
  
  const getStmt = db.prepare('SELECT profile_id, is_selected FROM messages WHERE id = ?');
  getStmt.bind([messageId]);
  
  let message = null;
  if (getStmt.step()) {
    message = getStmt.getAsObject();
  }
  getStmt.free();
  
  if (!message) {
    return false;
  }
  
  const deleteStmt = db.prepare('DELETE FROM messages WHERE id = ?');
  deleteStmt.bind([messageId]);
  deleteStmt.step();
  deleteStmt.free();
  
  // If the deleted message was selected, select the first available message
  if (message.is_selected === 1) {
    const firstStmt = db.prepare(`
      SELECT id FROM messages 
      WHERE profile_id = ? 
      ORDER BY created_at ASC 
      LIMIT 1
    `);
    firstStmt.bind([message.profile_id]);
    
    if (firstStmt.step()) {
      const firstMessage = firstStmt.getAsObject();
      selectMessage(firstMessage.id);
    }
    firstStmt.free();
  }
  
  saveDatabase();
  
  return true;
}

// Select a message (only one can be selected per profile)
function selectMessage(messageId) {
  if (!db) throw new Error('Database not initialized');
  
  const getStmt = db.prepare('SELECT profile_id FROM messages WHERE id = ?');
  getStmt.bind([messageId]);
  
  let message = null;
  if (getStmt.step()) {
    message = getStmt.getAsObject();
  }
  getStmt.free();
  
  if (!message) {
    return false;
  }
  
  // Unselect all messages for this profile
  const unselectStmt = db.prepare('UPDATE messages SET is_selected = 0 WHERE profile_id = ?');
  unselectStmt.bind([message.profile_id]);
  unselectStmt.step();
  unselectStmt.free();
  
  // Select the specified message
  const selectStmt = db.prepare('UPDATE messages SET is_selected = 1 WHERE id = ?');
  selectStmt.bind([messageId]);
  selectStmt.step();
  selectStmt.free();
  
  saveDatabase();
  
  return true;
}

// Seed initial messages from profiles.js if database is empty
function seedInitialMessages(profiles) {
  if (!db) return;
  
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM messages');
  countStmt.step();
  const { count } = countStmt.getAsObject();
  countStmt.free();
  
  if (count === 0) {
    console.log('Banco de dados vazio, importando mensagens iniciais...');
    
    profiles.forEach(profile => {
      try {
        addMessage(profile.id, profile.message, profile.imagePath);
        console.log(`✓ Mensagem inicial adicionada para ${profile.name}`);
      } catch (error) {
        console.error(`Erro ao adicionar mensagem para ${profile.name}:`, error);
      }
    });
  }
}

// Seed initial profiles (Thiago and Debora) if not present
function seedInitialProfiles() {
  if (!db) return;

  const countStmt = db.prepare('SELECT COUNT(*) as count FROM profiles');
  countStmt.step();
  const { count } = countStmt.getAsObject();
  countStmt.free();

  if (count === 0) {
    console.log('Banco de dados: tabela profiles vazia, criando perfis iniciais...');

    const initialProfiles = [
      {
        id: 'thiago',
        name: 'Thiago',
        image_path: path.join(process.cwd(), 'imagem_thiago.jpg'),
        default_message: `🚨 *PARE DE PAGAR CARO NO SEGURO!* 🚨\n👉 Carro | Moto\n\n💰 *ECONOMIZE ATÉ 50% AGORA!*\n✅ As melhores taxas do mercado\n✅ Cotações rápidas, sem enrolação\n\n📋 *Aceitamos:*\n• Drivh\n• CNH brasileira\n• Passaporte\n• Habilitação estrangeira\n\n🧑‍💼 Thiago | Seu Corretor de Confiança\nFale comigo no WhatsApp e receba sua cotação em minutos:\n👉 https://wa.me/message/BMDAOE4YSM7HN1`,
        is_admin: 1
      },
      {
        id: 'debora',
        name: 'Debora',
        image_path: path.join(process.cwd(), 'imagem_debora.jpg'),
        default_message: `🔒 SEGURANÇA NO VOLANTE COMEÇA AQUI!\n� Seguro de carro, moto e casa\n\n�REDUZA SEU SEGURO EM ATÉ 50%, GARANTIMOS AS MELHORES TAXAS DO MERCADO\n\n� COTAÇÃO RÁPIDA E SEM BUROCRACIA!\nAceitamos: \n* CNH \n* Passaporte \n* Habilitação estrangeira\n\n👩🏻‍💼Débora | Corretora de Seguros\n📞 Clique aqui e peça sua cotação:\nhttps://wa.me/message/X4X7FBTDBF7RH1`,
        is_admin: 1
      }
    ];

    const insertProfileStmt = db.prepare(`
      INSERT INTO profiles (id, name, image_path, default_message, is_admin) VALUES (?, ?, ?, ?, ?)
    `);

    const insertSessionStmt = db.prepare(`
      INSERT INTO profile_sessions (profile_id, session_dir) VALUES (?, ?)
    `);

    initialProfiles.forEach(p => {
      try {
        insertProfileStmt.bind([p.id, p.name, p.image_path, p.default_message, p.is_admin ? 1 : 0]);
        insertProfileStmt.step();
        insertProfileStmt.reset();

        // Novo padrão: userData/sessions/<profileId>
        const sessionDir = PathResolver.getProfileSessionDir(p.id);
        fs.mkdirSync(sessionDir, { recursive: true });
        insertSessionStmt.bind([p.id, sessionDir]);
        insertSessionStmt.step();
        insertSessionStmt.reset();

        console.log(`✓ Perfil inicial criado: ${p.name}`);
      } catch (error) {
        console.error('Erro ao criar perfil inicial', p.id, error);
      }
    });

    insertProfileStmt.free();
    insertSessionStmt.free();
    saveDatabase();
  }
}

// Migra diretórios antigos (./whatsapp_session_<id>) para o novo padrão userData/sessions/<id>
function migrateSessionDirs() {
  if (!db) return;
  try {
    const stmt = db.prepare('SELECT profile_id, session_dir FROM profile_sessions');
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    if (!rows.length) return; // Nada para migrar

    const updated = [];
    rows.forEach(row => {
      const oldPattern = path.join(process.cwd(), `whatsapp_session_${row.profile_id}`);
      const isOld = row.session_dir === oldPattern || /whatsapp_session_/i.test(row.session_dir);
      if (isOld) {
        const newDir = PathResolver.getProfileSessionDir(row.profile_id);
        // Criar raiz se necessário
        fs.mkdirSync(path.dirname(newDir), { recursive: true });
        // Mover diretório antigo se existir e novo não existir
        if (fs.existsSync(row.session_dir) && !fs.existsSync(newDir)) {
          try {
            fs.renameSync(row.session_dir, newDir);
            console.log(`✓ Diretório de sessão migrado: ${row.session_dir} -> ${newDir}`);
          } catch (err) {
            console.warn(`Falha ao mover sessão, tentando copiar: ${row.session_dir}`, err);
            try {
              fs.mkdirSync(newDir, { recursive: true });
            } catch (_) {}
          }
        } else if (!fs.existsSync(newDir)) {
          fs.mkdirSync(newDir, { recursive: true });
        }

        const upd = db.prepare('UPDATE profile_sessions SET session_dir = ?, updated_at = CURRENT_TIMESTAMP WHERE profile_id = ?');
        upd.bind([newDir, row.profile_id]);
        upd.step();
        upd.free();
        updated.push(row.profile_id);
      }
    });

    if (updated.length) {
      saveDatabase();
      console.log(`✓ Migração de sessões concluída (${updated.length})`);
    }
  } catch (error) {
    console.error('Erro na migração de diretórios de sessão', error);
  }
}

// Get all profiles from database
function getAllProfiles() {
  if (!db) return [];
  const stmt = db.prepare('SELECT * FROM profiles ORDER BY name ASC');
  const items = [];
  while (stmt.step()) {
    items.push(stmt.getAsObject());
  }
  stmt.free();
  return items;
}

// Get a single profile
function getProfileById(profileId) {
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM profiles WHERE id = ? LIMIT 1');
  stmt.bind([profileId]);
  let profile = null;
  if (stmt.step()) {
    profile = stmt.getAsObject();
  }
  stmt.free();
  return profile;
}

// Update profile basic fields (name, image_path, is_admin)
function updateProfile(profileId, updates = {}) {
  if (!db) throw new Error('Database not initialized');
  if (!profileId) throw new Error('Perfil inválido');

  const existing = getProfileById(profileId);
  if (!existing) {
    throw new Error('Perfil não encontrado');
  }

  const setters = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
    const name = (updates.name || '').trim();
    if (!name) {
      throw new Error('Nome inválido');
    }
    setters.push('name = ?');
    values.push(name);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'imagePath') || Object.prototype.hasOwnProperty.call(updates, 'image_path')) {
    let imagePath = updates.imagePath ?? updates.image_path ?? '';
    imagePath = (imagePath || '').trim();
    if (!imagePath) {
      // Volta para avatar padrão
      imagePath = DEFAULT_AVATAR_TOKEN;
    } else if (imagePath !== DEFAULT_AVATAR_TOKEN && !fs.existsSync(imagePath)) {
      throw new Error('Caminho da imagem não encontrado');
    }
    setters.push('image_path = ?');
    values.push(imagePath);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'isAdmin') || Object.prototype.hasOwnProperty.call(updates, 'is_admin')) {
    const isAdmin = !!(updates.isAdmin ?? updates.is_admin);
    setters.push('is_admin = ?');
    values.push(isAdmin ? 1 : 0);
  }

  if (setters.length === 0) {
    return existing;
  }

  const sql = `UPDATE profiles SET ${setters.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  const stmt = db.prepare(sql);
  stmt.bind([...values, profileId]);
  stmt.step();
  stmt.free();
  saveDatabase();
  return getProfileById(profileId);
}

// Get session info for profile
function getProfileSession(profileId) {
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM profile_sessions WHERE profile_id = ? LIMIT 1');
  stmt.bind([profileId]);
  let session = null;
  if (stmt.step()) {
    session = stmt.getAsObject();
  }
  stmt.free();
  return session;
}

// Update session last used timestamp
function updateProfileSessionUsage(profileId) {
  if (!db) return false;
  const stmt = db.prepare('UPDATE profile_sessions SET last_used_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE profile_id = ?');
  stmt.bind([profileId]);
  stmt.step();
  stmt.free();
  saveDatabase();
  return true;
}

// Get profile settings
function getProfileSettings(profileId) {
  if (!db) return null;
  
  const stmt = db.prepare('SELECT * FROM profile_settings WHERE profile_id = ?');
  stmt.bind([profileId]);
  
  let settings = null;
  if (stmt.step()) {
    settings = stmt.getAsObject();
  }
  stmt.free();
  
  // Return default if not found
  if (!settings) {
    return { profile_id: profileId, send_limit: 200 };
  }
  
  return settings;
}

// Update profile settings
function updateProfileSettings(profileId, sendLimit) {
  if (!db) throw new Error('Database not initialized');
  
  // Check if settings exist
  const checkStmt = db.prepare('SELECT profile_id FROM profile_settings WHERE profile_id = ?');
  checkStmt.bind([profileId]);
  const exists = checkStmt.step();
  checkStmt.free();
  
  if (exists) {
    // Update existing
    const updateStmt = db.prepare(`
      UPDATE profile_settings 
      SET send_limit = ?, updated_at = CURRENT_TIMESTAMP
      WHERE profile_id = ?
    `);
    updateStmt.bind([sendLimit, profileId]);
    updateStmt.step();
    updateStmt.free();
  } else {
    // Insert new
    const insertStmt = db.prepare(`
      INSERT INTO profile_settings (profile_id, send_limit)
      VALUES (?, ?)
    `);
    insertStmt.bind([profileId, sendLimit]);
    insertStmt.step();
    insertStmt.free();
  }
  
  saveDatabase();
  return true;
}

function normalizeQuoteRow(row) {
  if (!row) {
    return null;
  }

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
  if (!db || !id) {
    return null;
  }

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
  if (!db) {
    return [];
  }

  const stmt = db.prepare(`
    SELECT id, nome, documento, payload, trello_card_id, trello_card_url, created_at, updated_at
    FROM quotes
    ORDER BY datetime(created_at) DESC, datetime(updated_at) DESC
  `);

  const items = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    const normalized = normalizeQuoteRow(row);
    if (normalized) {
      items.push(normalized);
    }
  }
  stmt.free();

  return items;
}

function upsertQuoteRecord(quote) {
  if (!db) {
    throw new Error('Database not initialized');
  }

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

// Delete a quote by id
function deleteQuoteById(id) {
  if (!db || !id) {
    return false;
  }

  const getStmt = db.prepare('SELECT id FROM quotes WHERE id = ? LIMIT 1');
  getStmt.bind([id]);
  const exists = getStmt.step();
  getStmt.free();

  if (!exists) {
    return false;
  }

  const delStmt = db.prepare('DELETE FROM quotes WHERE id = ?');
  delStmt.bind([id]);
  delStmt.step();
  delStmt.free();

  saveDatabase();
  return true;
}

module.exports = {
  initDatabase,
  getMessages,
  getSelectedMessage,
  addMessage,
  updateMessage,
  deleteMessage,
  selectMessage,
  seedInitialMessages,
  getProfileSettings,
  updateProfileSettings,
  seedInitialProfiles,
  getAllProfiles,
  getProfileById,
  getProfileSession,
  updateProfileSessionUsage,
  migrateSessionDirs,
  getProfileCount,
  createProfile,
  updateProfile,
  listQuotes,
  getQuoteById,
  upsertQuoteRecord,
  deleteQuoteById,
  MAX_PROFILES
};
