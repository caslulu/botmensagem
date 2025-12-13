# Módulo de Automação - Arquitetura Modular

## 📁 Estrutura de Diretórios

```
src/main/automation/
├── index.js                    # Ponto de entrada do módulo
├── automation-controller.js    # Orquestrador principal
├── browser-manager.js          # Gerenciamento do navegador
├── whatsapp-service.js         # Interação com WhatsApp Web
├── message-sender.js           # Envio de mensagens
├── chat-processor.js           # Processamento de múltiplos chats
├── profile-validator.js        # Validação de perfis
├── config.js                   # Configurações centralizadas
└── utils/
    ├── logger.js               # Sistema de logs
    ├── path-resolver.js        # Resolução de caminhos
    └── chrome-detector.js      # Detecção do Google Chrome
```

## 🏗️ Módulos e Responsabilidades

### AutomationController
**Arquivo:** `automation-controller.js`

**Responsabilidade:** Orquestração principal do fluxo de automação

**Métodos Públicos:**
- `start(profile)` - Inicia automação para um perfil
- `stop()` - Para automação em execução

**Eventos Emitidos:**
- `log` - Mensagens de log
- `status` - Atualizações de status

**Exemplo de Uso:**
```javascript
const automation = require('./automation');

automation.on('log', (message) => console.log(message));
automation.on('status', (status) => console.log(status));

await automation.start(profile);
```

---

### BrowserManager
**Arquivo:** `browser-manager.js`

**Responsabilidade:** Gerencia o ciclo de vida do navegador (Chrome/Chromium)

**Métodos:**
- `launch(sessionDir)` - Abre navegador com sessão persistente
- `close()` - Fecha navegador
- `isOpen()` - Verifica se está aberto
- `getPage()` - Retorna página atual
- `getContext()` - Retorna contexto do navegador

**Funcionalidades:**
- Detecção automática do Google Chrome instalado
- Fallback para Chromium do Playwright
- Gerenciamento de sessões persistentes

---

### WhatsAppService
**Arquivo:** `whatsapp-service.js`

**Responsabilidade:** Interação com WhatsApp Web

**Métodos:**
- `open(page)` - Abre WhatsApp Web e aguarda login
- `goToArchivedChats(page)` - Navega para chats arquivados
- `initialScroll(page, checkStop)` - Scroll inicial para carregar chats
- `getVisibleChats(page)` - Obtém chats visíveis
- `getChatName(chatLocator)` - Extrai nome de um chat
- `openChat(chatLocator)` - Abre um chat
- `backToChatList(page)` - Volta para lista de chats
- `scrollChatList(page, iterations, checkStop)` - Scroll na lista

**Uso:**
```javascript
const whatsappService = new WhatsAppService(logger);
await whatsappService.open(page);
await whatsappService.goToArchivedChats(page);
const chats = await whatsappService.getVisibleChats(page);
```

---

### MessageSender
**Arquivo:** `message-sender.js`

**Responsabilidade:** Envio de mensagens com imagem

**Métodos:**
- `send(page, message, imagePath)` - Envia mensagem com imagem
- `waitDelay(page)` - Aguarda intervalo entre mensagens

**Fluxo:**
1. Abre menu de anexos
2. Seleciona "Fotos e vídeos"
3. Faz upload da imagem
4. Preenche texto da mensagem
5. Envia

---

### ChatProcessor
**Arquivo:** `chat-processor.js`

**Responsabilidade:** Processa múltiplos chats e controla limites

**Métodos:**
- `processVisibleChats(page, profile, checkStop)` - Processa chats na tela
- `processChat(page, chatLocator, chatName, profile)` - Processa chat individual
- `processMultipleIterations(page, profile, checkStop)` - Múltiplas iterações
- `getTotalProcessed()` - Total de chats processados
- `reset()` - Reseta contador

**Recursos:**
- Controle de chats já processados (evita duplicação)
- Respeita limite de envios por perfil
- Scroll periódico automático

---

### ProfileValidator
**Arquivo:** `profile-validator.js`

**Responsabilidade:** Validação e preparação de perfis

**Método:**
- `validate(profile)` - Valida e retorna perfil preparado

**Validações:**
- Verifica estrutura do perfil
- Resolve e valida caminho da imagem
- Valida mensagem não vazia
- Resolve caminho da sessão
- Define sendLimit padrão

---

### Logger
**Arquivo:** `utils/logger.js`

**Responsabilidade:** Sistema de logs formatado

**Métodos:**
- `log(message)` - Log normal
- `info(message)` - Log informativo (ℹ️)
- `success(message)` - Log de sucesso (✅)
- `warn(message)` - Log de aviso (⚠️)
- `error(message, error)` - Log de erro (❌)
- `setProfile(profile)` - Define perfil para prefixo

---

### PathResolver
**Arquivo:** `utils/path-resolver.js`

**Responsabilidade:** Resolução e validação de caminhos

**Métodos:**
- `resolve(filePath)` - Converte relativo para absoluto
- `exists(filePath)` - Verifica se arquivo existe
- `validate(filePath, errorMessage)` - Valida ou lança erro
- `ensureDir(dirPath)` - Cria diretório recursivamente

---

### ChromeDetector
**Arquivo:** `utils/chrome-detector.js`

**Responsabilidade:** Detecção do Google Chrome instalado

**Métodos:**
- `detect()` - Detecta Chrome no sistema
- `detectWindows()` - Detecta no Windows
- `detectLinux()` - Detecta no Linux
- `detectMacOS()` - Detecta no macOS

**Locais de Busca (Windows):**
- `C:\Program Files\Google\Chrome\Application\chrome.exe`
- `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`
- `%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe`
- Registro do Windows (fallback)

---

### Config
**Arquivo:** `config.js`

**Responsabilidade:** Configurações centralizadas

**Constantes:**
```javascript
{
  MESSAGE_DELAY_MS: 2000,        // Delay entre mensagens
  INITIAL_WAIT_MS: 30000,        // Espera inicial após login
  DEFAULT_SEND_LIMIT: 200,       // Limite padrão de envios
  LOOP_QUANTITY: 10,             // Número de iterações
  SCROLL_AFTER_SENDS: 2,         // Scroll a cada N envios
  WHATSAPP_URL: 'https://web.whatsapp.com',
  // ... outras configurações
}
```

**Vantagens:**
- Fácil ajuste de parâmetros
- Valores centralizados
- Evita "magic numbers" no código

---

## 🔄 Fluxo de Execução

```
AutomationController.start(profile)
    ↓
ProfileValidator.validate(profile)
    ↓
BrowserManager.launch(sessionDir)
    ↓
WhatsAppService.open(page)
    ↓
WhatsAppService.goToArchivedChats(page)
    ↓
WhatsAppService.initialScroll(page)
    ↓
ChatProcessor.processMultipleIterations(page, profile)
    ├─→ WhatsAppService.getVisibleChats(page)
    ├─→ WhatsAppService.getChatName(chat)
    ├─→ WhatsAppService.openChat(chat)
    ├─→ MessageSender.send(page, message, image)
    ├─→ WhatsAppService.backToChatList(page)
    └─→ Repete até limite ou sem novos chats
    ↓
BrowserManager.close()
    ↓
AutomationController emite status final
```

---

## 🎯 Como Adicionar Novas Funcionalidades

### 1. Adicionar Novo Tipo de Mensagem

**Criar novo arquivo:** `src/main/automation/telegram-sender.js`

```javascript
class TelegramSender {
  constructor(logger) {
    this.logger = logger;
  }

  async send(page, message) {
    // Implementação específica do Telegram
  }
}

module.exports = TelegramSender;
```

**Integrar no controller:**
```javascript
// automation-controller.js
const TelegramSender = require('./telegram-sender');

initializeModules() {
  // ... módulos existentes
  this.telegramSender = new TelegramSender(this.logger);
}
```

---

### 2. Adicionar Nova Validação

**Editar:** `profile-validator.js`

```javascript
static validate(profile) {
  // ... validações existentes
  
  // Nova validação
  if (profile.tipo === 'telegram' && !profile.token) {
    throw new Error('Token do Telegram é obrigatório');
  }
  
  return { ...profile };
}
```

---

### 3. Adicionar Nova Configuração

**Editar:** `config.js`

```javascript
module.exports = {
  // ... configurações existentes
  
  // Novas configurações
  TELEGRAM_DELAY_MS: 3000,
  MAX_RETRIES: 3,
};
```

---

### 4. Adicionar Novo Utilitário

**Criar:** `src/main/automation/utils/file-validator.js`

```javascript
class FileValidator {
  static validateImage(filePath) {
    const allowedExtensions = ['.jpg', '.png', '.jpeg'];
    // ... lógica de validação
  }
}

module.exports = FileValidator;
```

**Exportar no index:**
```javascript
// index.js
module.exports.FileValidator = require('./utils/file-validator');
```

---

## 🧪 Como Testar Módulos Individualmente

### Testar ChromeDetector

```javascript
const ChromeDetector = require('./automation/utils/chrome-detector');

const chromePath = ChromeDetector.detect();
console.log('Chrome encontrado em:', chromePath);
```

### Testar PathResolver

```javascript
const PathResolver = require('./automation/utils/path-resolver');

const absolutePath = PathResolver.resolve('./imagem.jpg');
const exists = PathResolver.exists(absolutePath);
console.log('Caminho:', absolutePath, 'Existe:', exists);
```

### Testar Logger

```javascript
const Logger = require('./automation/utils/logger');
const EventEmitter = require('events');

const emitter = new EventEmitter();
const logger = new Logger(emitter, { name: 'Teste' });

emitter.on('log', console.log);

logger.info('Teste de log');
logger.success('Operação bem-sucedida');
logger.error('Erro encontrado', new Error('Teste'));
```

---

## 📝 Convenções de Código

### Nomenclatura
- **Classes:** PascalCase (`BrowserManager`)
- **Arquivos:** kebab-case (`browser-manager.js`)
- **Métodos:** camelCase (`getChatName()`)
- **Constantes:** UPPER_SNAKE_CASE (`MESSAGE_DELAY_MS`)

### Documentação
- Use JSDoc para documentar métodos públicos
- Inclua tipos de parâmetros e retorno
- Adicione exemplos quando necessário

```javascript
/**
 * Envia uma mensagem com imagem
 * @param {Page} page - Página do Playwright
 * @param {string} message - Texto da mensagem
 * @param {string} imagePath - Caminho da imagem
 * @returns {Promise<void>}
 * @throws {Error} Se houver erro no envio
 */
async send(page, message, imagePath) {
  // ...
}
```

### Tratamento de Erros
- Sempre use try/catch em operações assíncronas
- Log erros com contexto suficiente
- Propague erros críticos para o controller

```javascript
try {
  await this.whatsappService.open(page);
} catch (error) {
  this.logger.error('Erro ao abrir WhatsApp', error);
  throw error; // Propagar para controller
}
```

---

## 🔧 Manutenção

### Atualizar Delay entre Mensagens

**Editar:** `config.js`
```javascript
MESSAGE_DELAY_MS: 3000, // Era 2000
```

### Mudar Limite Padrão de Envios

**Editar:** `config.js`
```javascript
DEFAULT_SEND_LIMIT: 300, // Era 200
```

### Adicionar Novo Seletor do WhatsApp

**Editar:** `whatsapp-service.js`
```javascript
async getNewFeature(page) {
  const element = page.getByRole('button', { name: 'Novo Recurso' });
  await element.click();
}
```

### Alterar Lógica de Scroll

**Editar:** `whatsapp-service.js` ou `chat-processor.js`

---

## 🚀 Performance

### Otimizações Implementadas
- ✅ Reutilização de sessão do navegador
- ✅ Scroll periódico (não carrega tudo de uma vez)
- ✅ Set() para tracking de chats processados (O(1) lookup)
- ✅ Timeouts configuráveis
- ✅ Verificação de parada a cada operação

### Possíveis Melhorias Futuras
- [ ] Pool de navegadores (múltiplos perfis simultâneos)
- [ ] Cache de seletores do WhatsApp
- [ ] Retry automático em falhas temporárias
- [ ] Métricas de performance (tempo por envio, etc)

---

## 📚 Referências

- [Playwright Documentation](https://playwright.dev/)
- [Node.js EventEmitter](https://nodejs.org/api/events.html)
- [Clean Code Principles](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
