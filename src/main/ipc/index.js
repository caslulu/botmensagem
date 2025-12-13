const { registerAutomationHandlers } = require('./automation-handlers');
const { registerMessageHandlers } = require('./message-handlers');
const { registerProfileHandlers } = require('./profile-handlers');
const { registerFileHandlers } = require('./file-handlers');
const { registerServiceHandlers } = require('./services-handlers');
const { registerPriceHandlers } = require('./price-handlers');
const { registerRtaHandlers } = require('./rta-handlers');
const { registerTrelloHandlers } = require('./trello-handlers');
const { registerQuoteHandlers } = require('./quotes-handlers');

function registerIpcHandlers(getMainWindow) {
  registerAutomationHandlers();
  registerMessageHandlers();
  registerProfileHandlers();
  registerServiceHandlers();
  registerPriceHandlers();
  registerRtaHandlers();
  registerTrelloHandlers();
  registerQuoteHandlers();
  registerFileHandlers(getMainWindow);
}

module.exports = { registerIpcHandlers };
