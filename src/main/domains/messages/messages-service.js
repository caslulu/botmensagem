const {
  getMessages,
  addMessage,
  updateMessage,
  deleteMessage,
  selectMessage
} = require('../../infra/db/messages-repository');
const { formatMessageForRenderer } = require('../../utils/message-formatter');
const { createSuccess } = require('../../utils/result');

function listByProfile(profileId) {
  const messages = getMessages(profileId);
  const formatted = messages.map(formatMessageForRenderer).filter(Boolean);
  return createSuccess({ messages: formatted });
}

function create(profileId, text, imagePath) {
  const messageId = addMessage(profileId, text, imagePath);
  return createSuccess({ messageId });
}

function update(messageId, text, imagePath) {
  const success = updateMessage(messageId, text, imagePath);
  return createSuccess({ updated: success }, success);
}

function remove(messageId) {
  const success = deleteMessage(messageId);
  return createSuccess({ deleted: success }, success);
}

function select(messageId) {
  const success = selectMessage(messageId);
  return createSuccess({ selected: success }, success);
}

module.exports = {
  listByProfile,
  create,
  update,
  remove,
  select
};
