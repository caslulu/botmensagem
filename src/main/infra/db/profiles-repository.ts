import fs from 'fs';
import path from 'path';
import { getDb, saveDatabase } from './sqlite';
import PathResolver from '../../automation/utils/path-resolver';
import { DEFAULT_AVATAR_TOKEN } from '../../constants/profile';

export type ProfileRecord = {
  id: string;
  name: string;
  image_path: string;
  default_message: string;
  is_admin: number;
  created_at?: string;
  updated_at?: string;
};

type ProfileSession = {
  profile_id: string;
  session_dir: string;
  last_used_at?: string;
  created_at?: string;
  updated_at?: string;
};

export const MAX_PROFILES = 10;

export function getProfileCount(): number {
  const db = getDb();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM profiles');
  stmt.step();
  const { count } = stmt.getAsObject<{ count: number }>();
  stmt.free();
  return count;
}

export function getAllProfiles(): ProfileRecord[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM profiles ORDER BY name ASC');
  const items: ProfileRecord[] = [];
  while (stmt.step()) {
    items.push(stmt.getAsObject() as ProfileRecord);
  }
  stmt.free();
  return items;
}

export function getProfileById(profileId: string): ProfileRecord | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM profiles WHERE id = ? LIMIT 1');
  stmt.bind([profileId]);
  let profile: ProfileRecord | null = null;
  if (stmt.step()) {
    profile = stmt.getAsObject() as ProfileRecord;
  }
  stmt.free();
  return profile;
}

type CreateProfileInput = {
  id: string;
  name: string;
  imagePath?: string | null;
  image_path?: string | null;
  defaultMessage?: string | null;
  default_message?: string | null;
  isAdmin?: boolean | null;
  is_admin?: boolean | null;
};

export function createProfile(profile: CreateProfileInput): ProfileRecord {
  const db = getDb();

  if (!profile) {
    throw new Error('Perfil inválido');
  }

  const { id, name } = profile;
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

  const insertProfileStmt = db.prepare(
    `
    INSERT INTO profiles (id, name, image_path, default_message, is_admin)
    VALUES (?, ?, ?, ?, ?)
  `
  );
  insertProfileStmt.bind([id, name, imagePath, defaultMessage, isAdmin ? 1 : 0]);
  insertProfileStmt.step();
  insertProfileStmt.free();

  const sessionDir = PathResolver.getProfileSessionDir(id);
  fs.mkdirSync(sessionDir, { recursive: true });

  const insertSessionStmt = db.prepare(
    `
    INSERT INTO profile_sessions (profile_id, session_dir)
    VALUES (?, ?)
  `
  );
  insertSessionStmt.bind([id, sessionDir]);
  insertSessionStmt.step();
  insertSessionStmt.free();

  saveDatabase();
  const created = getProfileById(id);
  if (!created) {
    throw new Error('Falha ao criar perfil');
  }
  return created;
}

type UpdateProfileInput = {
  name?: string | null;
  imagePath?: string | null;
  image_path?: string | null;
  isAdmin?: boolean | null;
  is_admin?: boolean | null;
};

export function updateProfile(profileId: string, updates: UpdateProfileInput = {}): ProfileRecord {
  const db = getDb();
  if (!profileId) throw new Error('Perfil inválido');

  const existing = getProfileById(profileId);
  if (!existing) {
    throw new Error('Perfil não encontrado');
  }

  const setters: string[] = [];
  const values: Array<string | number> = [];

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

  const updated = getProfileById(profileId);
  if (!updated) {
    throw new Error('Falha ao atualizar perfil');
  }
  return updated;
}

export function getProfileSession(profileId: string): ProfileSession | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM profile_sessions WHERE profile_id = ? LIMIT 1');
  stmt.bind([profileId]);
  let session: ProfileSession | null = null;
  if (stmt.step()) {
    session = stmt.getAsObject() as ProfileSession;
  }
  stmt.free();
  return session;
}

export function updateProfileSessionUsage(profileId: string): boolean {
  const db = getDb();
  const stmt = db.prepare(
    'UPDATE profile_sessions SET last_used_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE profile_id = ?'
  );
  stmt.bind([profileId]);
  stmt.step();
  stmt.free();
  saveDatabase();
  return true;
}

export function migrateSessionDirs(): void {
  const db = getDb();
  const stmt = db.prepare('SELECT profile_id, session_dir FROM profile_sessions');
  const rows: ProfileSession[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as ProfileSession);
  }
  stmt.free();

  if (!rows.length) return;

  const updated: string[] = [];
  rows.forEach((row) => {
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
          } catch (_) {
            // ignore
          }
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

export function deleteProfile(profileId: string): boolean {
  const db = getDb();
  const existing = getProfileById(profileId);
  if (!existing) {
    throw new Error('Perfil não encontrado');
  }

  // Delete from related tables
  const deleteMessagesStmt = db.prepare('DELETE FROM messages WHERE profile_id = ?');
  deleteMessagesStmt.bind([profileId]);
  deleteMessagesStmt.step();
  deleteMessagesStmt.free();

  const deleteSettingsStmt = db.prepare('DELETE FROM profile_settings WHERE profile_id = ?');
  deleteSettingsStmt.bind([profileId]);
  deleteSettingsStmt.step();
  deleteSettingsStmt.free();

  const session = getProfileSession(profileId);
  if (session && session.session_dir) {
    try {
      if (fs.existsSync(session.session_dir)) {
        fs.rmSync(session.session_dir, { recursive: true, force: true });
      }
    } catch (err) {
      console.error(`Falha ao remover diretório de sessão: ${session.session_dir}`, err);
    }
  }

  const deleteSessionStmt = db.prepare('DELETE FROM profile_sessions WHERE profile_id = ?');
  deleteSessionStmt.bind([profileId]);
  deleteSessionStmt.step();
  deleteSessionStmt.free();

  // Delete the profile itself
  const deleteProfileStmt = db.prepare('DELETE FROM profiles WHERE id = ?');
  deleteProfileStmt.bind([profileId]);
  deleteProfileStmt.step();
  deleteProfileStmt.free();

  saveDatabase();
  return true;
}
