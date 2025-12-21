import { getDb, saveDatabase } from './sqlite';

export type ProfileSettings = {
  profile_id: string;
  send_limit: number;
  updated_at?: string;
  created_at?: string;
};

export function getProfileSettings(profileId: string): ProfileSettings {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM profile_settings WHERE profile_id = ?');
  stmt.bind([profileId]);

  let settings: ProfileSettings | null = null;
  if (stmt.step()) {
    settings = stmt.getAsObject() as ProfileSettings;
  }
  stmt.free();

  if (!settings) {
    return { profile_id: profileId, send_limit: 200 };
  }

  return settings;
}

export function updateProfileSettings(profileId: string, sendLimit: number): boolean {
  const db = getDb();

  const checkStmt = db.prepare('SELECT profile_id FROM profile_settings WHERE profile_id = ?');
  checkStmt.bind([profileId]);
  const exists = checkStmt.step();
  checkStmt.free();

  if (exists) {
    const updateStmt = db.prepare(
      `
      UPDATE profile_settings 
      SET send_limit = ?, updated_at = CURRENT_TIMESTAMP
      WHERE profile_id = ?
    `
    );
    updateStmt.bind([sendLimit, profileId]);
    updateStmt.step();
    updateStmt.free();
  } else {
    const insertStmt = db.prepare(
      `
      INSERT INTO profile_settings (profile_id, send_limit)
      VALUES (?, ?)
    `
    );
    insertStmt.bind([profileId, sendLimit]);
    insertStmt.step();
    insertStmt.free();
  }

  saveDatabase();
  return true;
}
