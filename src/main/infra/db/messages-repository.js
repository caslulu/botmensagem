const { getDb, saveDatabase } = require('./sqlite');

const MAX_MESSAGES_PER_PROFILE = 5;
let selectMessageRef;

function getMessages(profileId) {
  const db = getDb();
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

function getSelectedMessage(profileId) {
  const db = getDb();
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

function addMessage(profileId, text, imagePath = null) {
  const db = getDb();

  const countStmt = db.prepare('SELECT COUNT(*) as count FROM messages WHERE profile_id = ?');
  countStmt.bind([profileId]);
  countStmt.step();
  const { count } = countStmt.getAsObject();
  countStmt.free();

  if (count >= MAX_MESSAGES_PER_PROFILE) {
    throw new Error(`Limite máximo de ${MAX_MESSAGES_PER_PROFILE} mensagens por perfil atingido`);
  }

  const isSelected = count === 0 ? 1 : 0;

  const stmt = db.prepare(`
    INSERT INTO messages (profile_id, text, image_path, is_selected)
    VALUES (?, ?, ?, ?)
  `);
  stmt.bind([profileId, text, imagePath, isSelected]);
  stmt.step();
  stmt.free();

  saveDatabase();

  const lastIdStmt = db.prepare('SELECT last_insert_rowid() as id');
  lastIdStmt.step();
  const { id } = lastIdStmt.getAsObject();
  lastIdStmt.free();

  return id;
}

function updateMessage(messageId, text, imagePath = null) {
  const db = getDb();

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

function deleteMessage(messageId) {
  const db = getDb();

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
      selectMessageRef(firstMessage.id);
    }
    firstStmt.free();
  }

  saveDatabase();
  return true;
}

function selectMessage(messageId) {
  const db = getDb();

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

  const unselectStmt = db.prepare('UPDATE messages SET is_selected = 0 WHERE profile_id = ?');
  unselectStmt.bind([message.profile_id]);
  unselectStmt.step();
  unselectStmt.free();

  const selectStmt = db.prepare('UPDATE messages SET is_selected = 1 WHERE id = ?');
  selectStmt.bind([messageId]);
  selectStmt.step();
  selectStmt.free();

  saveDatabase();
  return true;
}

selectMessageRef = selectMessage;

function seedInitialMessages(profiles) {
  const db = getDb();
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

module.exports = {
  getMessages,
  getSelectedMessage,
  addMessage,
  updateMessage,
  deleteMessage,
  selectMessage,
  seedInitialMessages
};
