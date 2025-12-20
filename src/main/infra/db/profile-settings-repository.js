const { getDb, saveDatabase } = require('./sqlite');

function getProfileSettings(profileId) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM profile_settings WHERE profile_id = ?');
  stmt.bind([profileId]);

  let settings = null;
  if (stmt.step()) {
    settings = stmt.getAsObject();
  }
  stmt.free();

  if (!settings) {
    return { profile_id: profileId, send_limit: 200 };
  }

  return settings;
}

function updateProfileSettings(profileId, sendLimit) {
  const db = getDb();

  const checkStmt = db.prepare('SELECT profile_id FROM profile_settings WHERE profile_id = ?');
  checkStmt.bind([profileId]);
  const exists = checkStmt.step();
  checkStmt.free();

  if (exists) {
    const updateStmt = db.prepare(`
      UPDATE profile_settings 
      SET send_limit = ?, updated_at = CURRENT_TIMESTAMP
      WHERE profile_id = ?
    `);
    updateStmt.bind([sendLimit, profileId]);
    updateStmt.step();
    updateStmt.free();
  } else {
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

module.exports = { getProfileSettings, updateProfileSettings };
