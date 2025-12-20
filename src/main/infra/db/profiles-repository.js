const fs = require('fs');
const path = require('path');
const { getDb, saveDatabase } = require('./sqlite');
const PathResolverModule = require('../../automation/utils/path-resolver');
const PathResolver = PathResolverModule.default || PathResolverModule;
const { DEFAULT_AVATAR_TOKEN } = require('../../constants/profile');

const MAX_PROFILES = 5;

function getProfileCount() {
  const db = getDb();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM profiles');
  stmt.step();
  const { count } = stmt.getAsObject();
  stmt.free();
  return count;
}

function getAllProfiles() {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM profiles ORDER BY name ASC');
  const items = [];
  while (stmt.step()) {
    items.push(stmt.getAsObject());
  }
  stmt.free();
  return items;
}

function getProfileById(profileId) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM profiles WHERE id = ? LIMIT 1');
  stmt.bind([profileId]);
  let profile = null;
  if (stmt.step()) {
    profile = stmt.getAsObject();
  }
  stmt.free();
  return profile;
}

function createProfile(profile) {
  const db = getDb();

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

function updateProfile(profileId, updates = {}) {
  const db = getDb();
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

function getProfileSession(profileId) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM profile_sessions WHERE profile_id = ? LIMIT 1');
  stmt.bind([profileId]);
  let session = null;
  if (stmt.step()) {
    session = stmt.getAsObject();
  }
  stmt.free();
  return session;
}

function updateProfileSessionUsage(profileId) {
  const db = getDb();
  const stmt = db.prepare('UPDATE profile_sessions SET last_used_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE profile_id = ?');
  stmt.bind([profileId]);
  stmt.step();
  stmt.free();
  saveDatabase();
  return true;
}

function migrateSessionDirs() {
  const db = getDb();
  const stmt = db.prepare('SELECT profile_id, session_dir FROM profile_sessions');
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();

  if (!rows.length) return;

  const updated = [];
  rows.forEach(row => {
    const oldPattern = path.join(process.cwd(), `whatsapp_session_${row.profile_id}`);
    const isOld = row.session_dir === oldPattern || /whatsapp_session_/i.test(row.session_dir);
    if (isOld) {
      const newDir = PathResolver.getProfileSessionDir(row.profile_id);
      fs.mkdirSync(path.dirname(newDir), { recursive: true });
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
}

module.exports = {
  MAX_PROFILES,
  getProfileCount,
  getAllProfiles,
  getProfileById,
  createProfile,
  updateProfile,
  getProfileSession,
  updateProfileSessionUsage,
  migrateSessionDirs
};
