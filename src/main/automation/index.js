/**
 * Módulo de Automação - Ponto de entrada
 * 
 * Estrutura modular para facilitar manutenção e expansão:
 * 
 * - AutomationController: Orquestração principal
 * - BrowserManager: Gerenciamento do navegador
 * - WhatsAppService: Interação com WhatsApp Web
 * - MessageSender: Envio de mensagens
 * - ChatProcessor: Processamento de múltiplos chats
 * - ProfileValidator: Validação de perfis
 * - Utils: Utilitários (Logger, PathResolver, ChromeDetector)
 * - Config: Configurações centralizadas
 */

// Importar e exportar a instância do controller
const automationController = require('./automation-controller');

// Exportar a instância como padrão
module.exports = automationController;

// Adicionar módulos individuais como propriedades (para uso avançado)
// Usando Object.defineProperty para não sobrescrever métodos da instância
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
