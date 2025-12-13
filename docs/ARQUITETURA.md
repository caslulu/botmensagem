# Arquitetura do Sistema

## 🏛️ Visão Geral

O Insurance Helper é construído usando Electron, seguindo a arquitetura de processos múltiplos:

```
┌─────────────────────────────────────────┐
│         Main Process (Node.js)          │
│  • Gerencia janelas                     │
│  • Acesso ao sistema de arquivos        │
│  • Banco de dados SQLite                │
│  • Automação Playwright                 │
│  • IPC Handlers                         │
└────────────┬────────────────────────────┘
             │ IPC Communication
             │ (Context Bridge)
┌────────────▼────────────────────────────┐
│      Renderer Process (Browser)         │
│  • Interface HTML/CSS/JS                │
│  • Lógica da UI                         │
│  • Event listeners                      │
│  • Chamadas IPC ao Main                 │
└─────────────────────────────────────────┘
```

## 📦 Componentes Principais

### 1. Main Process (`src/main/`)

#### `main.js`
- **Responsabilidade**: Orquestração central
- **Funções**:
  - Criar e gerenciar janelas do Electron
  - Configurar IPC handlers
  - Integrar módulos (database, automation, updater)
  - Gerenciar ciclo de vida da aplicação

#### `database.js`
- **Responsabilidade**: Persistência de dados
- **Tecnologia**: sql.js (SQLite em JavaScript)
- **Tabelas**:
  - `messages`: Armazena mensagens (texto + imagem)
  - `profile_settings`: Configurações por perfil
- **Operações**: CRUD completo via funções assíncronas

#### `profiles.js`
- **Responsabilidade**: Definição de perfis
- **Estrutura**:
```javascript
{
  id: 'thiago',
  name: 'Thiago',
  sessionDir: 'whatsapp_session_thiago',
  imagePath: 'imagem_thiago.jpg',
  selectedMessage: { /* da database */ },
  sendLimit: 10 // da database
}
```

#### `automation.js`
- **Responsabilidade**: Automação do WhatsApp Web
- **Tecnologia**: Playwright + Chromium
- **Fluxo**:
  1. Lança navegador com sessão persistente
  2. Aguarda login/scan QR Code
  3. Processa chats visíveis
  4. Envia mensagens conforme sendLimit
  5. Fecha navegador

#### `updater.js`
- **Responsabilidade**: Atualizações automáticas
- **Tecnologia**: electron-updater
- **Eventos**:
  - `update-available`: Notifica usuário
  - `download-progress`: Mostra progresso
  - `update-downloaded`: Prompt para instalar
- **Verificação**: Ao iniciar + a cada 30 minutos

### 2. Preload Process (`src/preload/`)

#### `preload.js`
- **Responsabilidade**: Bridge seguro entre Main e Renderer
- **Padrão**: Context Isolation
- **APIs Expostas**:
```javascript
window.api = {
  messages: {
    get: (profileId) => ipcRenderer.invoke(...),
    add: (data) => ipcRenderer.invoke(...),
    // ...
  },
  profile: { /* ... */ },
  automation: { /* ... */ },
  fileSystem: { /* ... */ }
}
```

### 3. Renderer Process (`src/renderer/`)

#### `index.html`
- **Responsabilidade**: Estrutura da UI
- **Componentes**:
  - Seletor de perfil
  - Lista de mensagens
  - Modal de edição
  - Campo de limite de envio
  - Botão de automação

#### `renderer.js`
- **Responsabilidade**: Lógica da interface
- **Funções Principais**:
  - `loadMessages()`: Carrega e renderiza mensagens
  - `openEditModal()`: Abre modal de edição
  - `saveMessage()`: Salva (adiciona/edita) mensagem
  - `selectProfile()`: Troca de perfil
  - `saveSendLimit()`: Persiste configuração

#### `styles.css`
- **Responsabilidade**: Estilos compilados
- **Origem**: Tailwind CSS (`styles/tailwind.css`)
- **Build**: PostCSS + Tailwind CLI

## 🔄 Fluxos de Dados

### Fluxo: Adicionar Mensagem

```
[Renderer] Usuário clica "Adicionar Mensagem"
    ↓
[Renderer] Abre modal, preenche dados
    ↓
[Renderer] Clica "Salvar" → window.api.messages.add(data)
    ↓
[IPC] ipcRenderer.invoke('messages:add', data)
    ↓
[Main] ipcMain.handle('messages:add') recebe
    ↓
[Database] addMessage() → INSERT INTO messages
    ↓
[Main] Retorna resultado
    ↓
[Renderer] Recebe confirmação, recarrega lista
```

### Fluxo: Automação

```
[Renderer] Usuário clica "Iniciar Automação"
    ↓
[Renderer] window.api.automation.start(profileId)
    ↓
[IPC] ipcRenderer.invoke('start-automation')
    ↓
[Main] Busca perfil com database.js
    ↓
[Main] automation.startAutomation(profile)
    ↓
[Playwright] Lança Chromium com sessionDir
    ↓
[Playwright] Aguarda login (scan QR)
    ↓
[Playwright] Navega pelos chats
    ↓
[Playwright] Envia mensagem (texto + imagem)
    ↓
[Playwright] Repete até sendLimit
    ↓
[Playwright] Fecha navegador
    ↓
[Main] Retorna resultado
    ↓
[Renderer] Mostra sucesso/erro
```

### Fluxo: Auto-Update

```
[App Inicia] → updater.setupAutoUpdater(mainWindow)
    ↓
[Updater] autoUpdater.checkForUpdatesAndNotify()
    ↓
[GitHub] Verifica latest release
    ↓
[Updater] Evento: update-available
    ↓
[Main] dialog.showMessageBox() → "Atualização disponível"
    ↓
[Usuário] Clica "Sim" → Download automático
    ↓
[Updater] Evento: download-progress (0-100%)
    ↓
[Updater] Evento: update-downloaded
    ↓
[Main] dialog.showMessageBox() → "Instalar agora?"
    ↓
[Usuário] Clica "Sim" → autoUpdater.quitAndInstall()
    ↓
[App] Fecha e instala nova versão
```

## 🗄️ Persistência de Dados

### Sessões WhatsApp
- **Local**: `whatsapp_session_<profile>/`
- **Conteúdo**: Cookies, localStorage, cache do Chromium
- **Gestão**: Playwright Context com `userDataDir`
- **Persistência**: Entre execuções da aplicação

### Banco de Dados
- **Local Desenvolvimento**: `./data/messages.db`
- **Local Produção**: `<userData>/data/messages.db`
- **Engine**: sql.js (SQLite WASM)
- **Carregamento**: Síncrono ao iniciar app
- **Salvamento**: A cada operação (INSERT, UPDATE, DELETE)

### Arquivos Estáticos
- **Imagens**: Caminho absoluto armazenado em `messages.image_path`
- **Acesso**: Via `file://` protocol no renderer
- **Validação**: Verificação de existência antes de usar

## 🔐 Segurança

### Context Isolation
```javascript
// preload.js
contextBridge.exposeInMainWorld('api', {
  // Apenas funções específicas expostas
});
```
- Renderer não tem acesso direto ao Node.js
- Previne execução de código malicioso

### Node Integration
```javascript
// main.js
webPreferences: {
  nodeIntegration: false,  // Desabilitado
  contextIsolation: true,  // Habilitado
  preload: path.join(__dirname, '../preload/preload.js')
}
```

### Validação de Inputs
- Limite de mensagens (máx 5 por perfil)
- Validação de tipo de arquivo (imagens)
- Sanitização de profileId

## 📊 Performance

### Otimizações
- **Lazy Loading**: Chromium só carrega quando necessário
- **Cache de Sessão**: WhatsApp session reutilizada
- **SQL Indexado**: Primary keys e índices em profileId
- **CSS Minificado**: Tailwind produz CSS otimizado

### Consumo de Recursos
- **Memória**: ~150-300 MB (Chromium + Electron)
- **Disco**: ~100 MB (instalado)
- **CPU**: Baixo em idle, alto durante automação

## 🧩 Extensibilidade

### Adicionar Novo Perfil
1. Adicionar em `profiles.js`:
```javascript
{
  id: 'novo',
  name: 'Novo Perfil',
  sessionDir: 'whatsapp_session_novo',
  imagePath: 'imagem_novo.jpg'
}
```
2. Criar imagem padrão
3. UI automaticamente detecta via `getProfiles()`

### Adicionar Nova Tabela
1. Modificar `initDatabase()` em `database.js`
2. Adicionar funções CRUD
3. Expor via IPC em `main.js`
4. Consumir via `window.api` no renderer

### Adicionar Nova Funcionalidade de Automação
1. Estender `automation.js`
2. Usar seletores Playwright
3. Adicionar handlers de erro
4. Testar com headless: false

## 🔧 Manutenção

### Atualizar Dependências
```bash
npm outdated              # Ver versões desatualizadas
npm update                # Atualizar minor/patch
npm install <pkg>@latest  # Atualizar major version
```

### Rebuild Nativo (se necessário)
```bash
npm run rebuild
# ou
npx electron-rebuild
```

### Logs de Debug
- **Desenvolvimento**: Console do terminal + DevTools
- **Produção**: `<userData>/logs/main.log`

## 📚 Referências

- [Electron Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [IPC Communication](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Playwright API](https://playwright.dev/docs/api/class-playwright)
- [sql.js Documentation](https://sql.js.org/documentation/)
