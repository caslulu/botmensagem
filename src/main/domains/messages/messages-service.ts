import { addMessage, deleteMessage, getMessages, selectMessage, updateMessage } from '../../infra/db/messages-repository';
import { formatMessageForRenderer } from '../../utils/message-formatter';
import { createSuccess } from '../../utils/result';

function listByProfile(profileId: string) {
  const messages = getMessages(profileId);
  const formatted = messages.map(formatMessageForRenderer).filter(Boolean);
  return createSuccess({ messages: formatted });
}

function create(profileId: string, text: string, imagePath?: string | null) {
  const messageId = addMessage(profileId, text, imagePath ?? null);
  return createSuccess({ messageId });
}

function update(messageId: number, text: string, imagePath?: string | null) {
  const success = updateMessage(messageId, text, imagePath ?? null);
  return createSuccess({ updated: success }, success);
}

function remove(messageId: number) {
  const success = deleteMessage(messageId);
  return createSuccess({ deleted: success }, success);
}

function select(messageId: number) {
  const success = selectMessage(messageId);
  return createSuccess({ selected: success }, success);
}

export default {
  listByProfile,
  create,
  update,
  remove,
  select
};
