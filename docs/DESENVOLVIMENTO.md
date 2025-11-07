# Guia de Desenvolvimento

## 🛠️ Configuração do Ambiente

### Requisitos
- Node.js 18+ 
- npm 9+
- Git

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/caslulu/botmensagem.git
cd botmensagem
```

2. Instale as dependências:
```bash
npm install
```

3. Instale o navegador Chromium para Playwright:
```bash
npm run playwright:install
```

## 🚀 Executando em Desenvolvimento

### Modo Desenvolvimento
```bash
npm run dev
```
Abre o aplicativo com DevTools e sem verificação de atualizações.

### Compilar CSS (Watch Mode)
Em um terminal separado:
```bash
npm run dev:css
```

### Modo Produção Local
```bash
npm start
```

## 🏗️ Estrutura do Projeto

```
botmensagem/
├── src/
│   ├── main/              # Processo principal do Electron
│   │   ├── main.js        # Ponto de entrada, gerencia janelas e IPC
│   │   ├── automation.js  # Lógica de automação do WhatsApp
│   │   ├── profiles.js    # Definições de perfis
│   │   ├── database.js    # Gerenciamento do SQLite
│   │   └── updater.js     # Sistema de auto-atualização
│   ├── preload/           # Scripts de preload (Context Bridge)
│   │   └── preload.js     # Expõe APIs seguras para o renderer
│   └── renderer/          # Interface do usuário
│       ├── index.html     # HTML principal
│       ├── renderer.js    # Lógica da UI
│       ├── styles.css     # CSS compilado do Tailwind
│       └── styles/
│           └── tailwind.css  # Tailwind source
├── data/
│   └── messages.db        # Banco de dados SQLite (criado em runtime)
├── whatsapp_session_*/    # Sessões do WhatsApp (criadas em runtime)
├── docs/                  # Documentação
├── build/                 # Recursos de build
└── dist/                  # Executáveis gerados
```

## 🔧 Tecnologias Utilizadas

### Core
- **Electron 39.1.1**: Framework desktop
- **Node.js**: Backend/Main process
- **JavaScript**: Linguagem principal

### Automação
- **Playwright 1.56.1**: Automação do WhatsApp Web via Chromium

### Database
- **sql.js 1.13.0**: SQLite em JavaScript puro
  - Escolhido por não requerer compilação nativa
  - Compatível com todas as plataformas

### UI
- **Tailwind CSS 3.4.14**: Framework CSS utility-first
- **PostCSS**: Processamento CSS

### Build & Deploy
- **electron-builder 26.0.12**: Geração de executáveis
- **electron-updater 6.6.2**: Sistema de atualizações automáticas
- **electron-log 5.4.3**: Logging estruturado

## 📊 Banco de Dados

### Schema

**Tabela: messages**
```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id TEXT NOT NULL,
  text TEXT,
  image_path TEXT,
  is_selected INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**Tabela: profile_settings**
```sql
CREATE TABLE profile_settings (
  profile_id TEXT PRIMARY KEY,
  send_limit INTEGER DEFAULT 10
)
```

### Localização
- Desenvolvimento: `./data/messages.db`
- Produção: `<userData>/data/messages.db`

## 🔌 Comunicação IPC

### Messages
- `messages:get` - Buscar mensagens do perfil
- `messages:add` - Adicionar nova mensagem
- `messages:update` - Atualizar mensagem existente
- `messages:delete` - Excluir mensagem
- `messages:select` - Marcar mensagem como selecionada

### Profile Settings
- `profile:get-settings` - Buscar configurações do perfil
- `profile:update-settings` - Atualizar configurações

### File System
- `file:select-image` - Abrir dialog de seleção de arquivo

### Automation
- `start-automation` - Iniciar processo de automação

## 🎨 Estilização

O projeto usa Tailwind CSS. Para modificar estilos:

1. Edite `src/renderer/styles/tailwind.css`
2. Execute `npm run dev:css` para recompilar
3. Os estilos compilados vão para `src/renderer/styles.css`

### Configuração Tailwind
Veja `tailwind.config.cjs` para customizações.

## 🧪 Debugging

### DevTools
Em modo desenvolvimento (`npm run dev`), o DevTools abre automaticamente.

### Logs
- Main process: Logs aparecem no terminal
- Renderer process: Console do DevTools
- Produção: Arquivos de log em `<userData>/logs/`

### Debug do Playwright
```javascript
// Em automation.js, adicione:
const browser = await chromium.launch({
  headless: false,  // Ver o navegador
  slowMo: 100       // Desacelerar ações
});
```

## 📦 Scripts Disponíveis

```bash
npm start              # Executar em modo produção
npm run dev            # Executar em modo desenvolvimento
npm run build:css      # Compilar CSS (minificado)
npm run dev:css        # Compilar CSS (watch mode)
npm run build          # Gerar executável Windows
npm run build:linux    # Gerar executável Linux
npm run build:dir      # Build sem instalar (para testes)
npm run publish        # Build e publicar no GitHub Releases
```

## 🐛 Troubleshooting

### Erro de compilação nativa
Se encontrar erros com módulos nativos:
- Use alternativas JavaScript puras (como sql.js ao invés de better-sqlite3)
- Configure electron-builder para bundle correto

### WhatsApp não abre
- Verifique se o Chromium está instalado: `npm run playwright:install`
- Confirme permissões de escrita em `whatsapp_session_*`

### CSS não atualiza
```bash
pkill -9 electron
npm run build:css
npm run dev
```

## 🔐 Segurança

### Context Isolation
O projeto usa Context Bridge para expor apenas APIs necessárias ao renderer:
```javascript
// preload.js
contextBridge.exposeInMainWorld('api', {
  messages: { ... },
  profile: { ... }
});
```

### Node Integration
`nodeIntegration: false` - Renderer não tem acesso direto ao Node.js

## 🚢 Deploy

Veja [BUILD.md](BUILD.md) para instruções completas de build.

Para publicar atualizações, consulte [ATUALIZACOES.md](../ATUALIZACOES.md).

## 📚 Recursos Adicionais

- [Documentação Electron](https://www.electronjs.org/docs)
- [Documentação Playwright](https://playwright.dev/)
- [Documentação Tailwind CSS](https://tailwindcss.com/docs)
- [Documentação electron-builder](https://www.electron.build/)
