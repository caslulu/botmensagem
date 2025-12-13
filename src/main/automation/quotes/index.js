const quoteAutomationService = require('./quote-automation-service');

module.exports = {
  runAutomation: (payload) => quoteAutomationService.runAutomation(payload)
};
