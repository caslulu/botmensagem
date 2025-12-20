/**
 * Módulo de Automação - Ponto de entrada
 */

const automationController = require('./automation-controller');

module.exports = automationController;

Object.defineProperty(module.exports, 'BrowserManager', {
  value: require('./browser-manager'),
  enumerable: true,
  configurable: false,
  writable: false
});

Object.defineProperty(module.exports, 'WhatsAppService', {
  value: require('./whatsapp-service'),
  enumerable: true,
  configurable: false,
  writable: false
});

Object.defineProperty(module.exports, 'MessageSender', {
  value: require('./message-sender'),
  enumerable: true,
  configurable: false,
  writable: false
});

Object.defineProperty(module.exports, 'ChatProcessor', {
  value: require('./chat-processor'),
  enumerable: true,
  configurable: false,
  writable: false
});

Object.defineProperty(module.exports, 'ProfileValidator', {
  value: require('./profile-validator'),
  enumerable: true,
  configurable: false,
  writable: false
});

Object.defineProperty(module.exports, 'Logger', {
  value: require('./utils/logger'),
  enumerable: true,
  configurable: false,
  writable: false
});

Object.defineProperty(module.exports, 'PathResolver', {
  value: require('./utils/path-resolver'),
  enumerable: true,
  configurable: false,
  writable: false
});

Object.defineProperty(module.exports, 'ChromeDetector', {
  value: require('./utils/chrome-detector'),
  enumerable: true,
  configurable: false,
  writable: false
});

Object.defineProperty(module.exports, 'config', {
  value: require('./config'),
  enumerable: true,
  configurable: false,
  writable: false
});
