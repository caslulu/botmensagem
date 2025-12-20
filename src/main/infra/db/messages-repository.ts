import type { Database } from 'sql.js';
import { getDb, saveDatabase } from './sqlite';

export type MessageRow = {
  id: number;
  profile_id: string;
  text: string;
  image_path: string | null;
  is_selected: number;
  created_at?: string;
  updated_at?: string;
};

type SeedProfile = {
  id: string;
  name: string;
  message: string | null;
  imagePath: string | null;
};

const MAX_MESSAGES_PER_PROFILE = 5;
let selectMessageRef: (messageId: number) => boolean;

export function getMessages(profileId: string): MessageRow[] {
  const db = getDb();
  const stmt = db.prepare(
    `
    SELECT * FROM messages 
    WHERE profile_id = ? 
    ORDER BY created_at ASC
  `
  );
  stmt.bind([profileId]);

  const messages: MessageRow[] = [];
  while (stmt.step()) {
    messages.push(stmt.getAsObject() as MessageRow);
  }
  stmt.free();

  return messages;
}

export function getSelectedMessage(profileId: string): MessageRow | null {
  const db = getDb();
  const stmt = db.prepare(
    `
    SELECT * FROM messages 
    WHERE profile_id = ? AND is_selected = 1 
    LIMIT 1
  `
  );
  stmt.bind([profileId]);

  let message: MessageRow | null = null;
  if (stmt.step()) {
    message = stmt.getAsObject() as MessageRow;
  }
  stmt.free();

  return message;
}

export function addMessage(profileId: string, text: string, imagePath: string | null = null): number {
  const db = getDb();

  const countStmt = db.prepare('SELECT COUNT(*) as count FROM messages WHERE profile_id = ?');
  countStmt.bind([profileId]);
  countStmt.step();
  const { count } = countStmt.getAsObject<{ count: number }>();
  countStmt.free();

  if (count >= MAX_MESSAGES_PER_PROFILE) {
    throw new Error(`Limite máximo de ${MAX_MESSAGES_PER_PROFILE} mensagens por perfil atingido`);
  }

  const isSelected = count === 0 ? 1 : 0;

  const stmt = db.prepare(
    `
    INSERT INTO messages (profile_id, text, image_path, is_selected)
    VALUES (?, ?, ?, ?)
  `
  );
  stmt.bind([profileId, text, imagePath, isSelected]);
  stmt.step();
  stmt.free();

  saveDatabase();

  const lastIdStmt = db.prepare('SELECT last_insert_rowid() as id');
  lastIdStmt.step();
  const { id } = lastIdStmt.getAsObject<{ id: number }>();
  lastIdStmt.free();

  return id;
}

export function updateMessage(messageId: number, text: string, imagePath: string | null = null): boolean {
  const db = getDb();

  const stmt = db.prepare(
    `
    UPDATE messages 
    SET text = ?, image_path = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `
  );
  stmt.bind([text, imagePath, messageId]);
  stmt.step();
  stmt.free();

  saveDatabase();
  return true;
}

export function deleteMessage(messageId: number): boolean {
  const db = getDb();

  const getStmt = db.prepare('SELECT profile_id, is_selected FROM messages WHERE id = ?');
  getStmt.bind([messageId]);

  let message: Pick<MessageRow, 'profile_id' | 'is_selected'> | null = null;
  if (getStmt.step()) {
    message = getStmt.getAsObject() as Pick<MessageRow, 'profile_id' | 'is_selected'>;
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
    const firstStmt = db.prepare(
      `
      SELECT id FROM messages 
      WHERE profile_id = ? 
      ORDER BY created_at ASC 
      LIMIT 1
    `
    );
    firstStmt.bind([message.profile_id]);

    if (firstStmt.step()) {
      const firstMessage = firstStmt.getAsObject<{ id: number }>();
      selectMessageRef(firstMessage.id);
    }
    firstStmt.free();
  }

  saveDatabase();
  return true;
}

export function selectMessage(messageId: number): boolean {
  const db = getDb();

  const getStmt = db.prepare('SELECT profile_id FROM messages WHERE id = ?');
  getStmt.bind([messageId]);

  let message: { profile_id: string } | null = null;
  if (getStmt.step()) {
    message = getStmt.getAsObject() as { profile_id: string };
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

export function seedInitialMessages(profiles: SeedProfile[]): void {
  const db = getDb();
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM messages');
  countStmt.step();
  const { count } = countStmt.getAsObject<{ count: number }>();
  countStmt.free();

  if (count === 0) {
    console.log('Banco de dados vazio, importando mensagens iniciais...');
    profiles.forEach((profile) => {
      try {
        addMessage(profile.id, profile.message ?? '', profile.imagePath);
        console.log(`✓ Mensagem inicial adicionada para ${profile.name}`);
      } catch (error) {
        console.error(`Erro ao adicionar mensagem para ${profile.name}:`, (error as Error).message);
      }
    });
  }
}
