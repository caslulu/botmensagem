const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(process.cwd(), 'data');
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

  // Create index for faster queries
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_profile_id ON messages(profile_id)
  `);
  
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
  updateProfileSettings
};
