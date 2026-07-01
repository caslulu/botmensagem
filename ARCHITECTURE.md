# Arquitetura — botmensagem (Insurance Helper)

Documentação técnica do sistema. Pareada com [SIMPLIFICATIONS.md](SIMPLIFICATIONS.md), que lista pontos fracos e propostas de limpeza.

---

## 1. Visão Geral

`botmensagem` (nome interno do produto: **Insurance Helper**, `com.caslulu.insurancehelper`) é uma aplicação **desktop Electron** usada internamente por 2 pessoas para apoiar a operação de uma corretora de seguros. Concentra em um único app:

- **RTA** — preenchimento automático de PDFs de seguradoras (Allstate, Progressive, Geico, Liberty) com dados do veículo/segurado.
- **Preço** — geração de imagens PNG de cotação ("price card") com overlay sobre templates por seguradora.
- **Mensagens WhatsApp** — envio em massa de templates (texto + imagem) via Evolution API rodando em Docker.
- **Kanban** — quadro de cotações em andamento, sincronizado com uma API REST cloud.
- **Templates de Mensagem** — CRUD de templates por perfil.

### Stack

| Camada | Tecnologia |
|---|---|
| Container | Electron + `electron-vite` |
| UI | React 19 + Tailwind 3.4 + PostCSS |
| Build/Pack | `electron-builder` (NSIS no Windows, DMG/zip no Mac, AppImage no Linux) |
| Auto-update | `electron-updater` via GitHub Releases |
| WhatsApp | Evolution API (Docker Compose) |
| Persistência | API cloud REST (sem banco local) |
| PDF | `pdf-lib` |
| Imagem | `@napi-rs/canvas` (nativo por plataforma) |
| Legado | `playwright` (importado, sem uso no fluxo atual) |

---

## 2. Estrutura de Pastas

```
botmensagem/
├── src/
│   ├── main/                     # Processo main (Node) — IPC, lógica de negócio
│   ├── preload/                  # contextBridge entre main e renderer
│   └── renderer/                 # UI React
├── apps/
│   └── api/                      # Backend cloud (Prisma + Postgres) — pouco desenvolvido
├── docker-compose.evolution.yml  # Stack WhatsApp (Evolution API)
├── .env.evolution                # Config Evolution + Postgres compartilhado
├── electron.vite.config.ts       # Build config (main + preload + renderer)
├── scripts/                      # Ícones Mac, libs nativas Windows
└── build/                        # Recursos de empacotamento (entitlements, ícones)
```

### `src/main/` em detalhe

```
main/
├── main.ts                       # Entry point do Electron
├── bootstrap.ts                  # Stub assíncrono (vazio)
├── core/app.ts                   # startMainProcess: lifecycle + janela principal
├── window-manager.ts             # Criação da BrowserWindow (1200x800)
├── automation/                   # WhatsApp bulk-send (Evolution API)
├── domains/
│   ├── auth/                     # Login cloud + sessão em disco
│   ├── messages/                 # Templates de mensagem
│   ├── profiles/                 # Perfis do usuário
│   └── files/                    # Operações de arquivo
├── price/                        # Geração de PNG de cotação (canvas)
├── rta/                          # Preenchimento de PDFs (pdf-lib)
├── ipc/                          # Handlers IPC (11 módulos)
├── services/                     # Camada de serviços (proxy cloud, etc.)
├── trello/                       # Pastas vazias (services/, utils/) — código morto
├── infra/db/                     # Pasta vazia (sem banco local)
├── constants/                    # profile.js (102 bytes, marcador vazio)
├── config/                       # Empty — config real está em automation/config.ts
├── types/                        # Definições TS
├── utils/                        # result.js, formatters
└── updater.js                    # electron-updater hook
```

### `src/renderer/src/` em detalhe

```
renderer/src/
├── App.tsx                       # Shell + sidebar + roteamento por módulo
├── app/modules.ts                # Registro dos módulos navegáveis
├── pages/
│   ├── kanban/                   # DesktopKanbanView.tsx (1838 linhas)
│   ├── whatsapp/                 # ConfigView (609), AutomationControl (199)
│   ├── rta/                      # Formulários de RTA
│   ├── price/                    # Formulário + preview de price card
│   ├── settings/                 # ConfigView (609), ProfileSettingsView (203)
│   ├── news/                     # Painel de novidades
│   ├── howto/                    # Guias de uso
│   ├── trello/components/        # Pasta vazia (legado)
│   └── web/                      # Pasta vazia (legado)
├── components/                   # UI compartilhada
├── contexts/                     # ProfileProvider, ThemeProvider
├── hooks/                        # useAdminGate, etc.
└── styles/                       # Tailwind + globals
```

### `src/preload/bridges/`

Bridge IPC por domínio: `automation`, `messages`, `quotes`, `rta`, `price`, `files`, `auth`, `web-api`, `services`.

---

## 3. Boot do Aplicativo

1. **`src/main/main.ts`** chama `startMainProcess()` em `core/app.ts`.
2. **Single-instance lock**: se outra instância já roda, esta encerra.
3. **`bootstrap.ts`**: stub assíncrono vazio (mantido por compatibilidade).
4. **`window-manager.ts`**: cria `BrowserWindow` 1200x800 com:
   - `contextIsolation: true`
   - preload em sandbox
   - CSP no HTML do renderer (self + Google Fonts + data: + blob:)
5. **Registro de IPC** (`ipc/index.ts`): registra todos os handlers.
6. **Auto-update**: `updater.js` inicia o `electron-updater` contra GitHub Releases.

---

## 4. Domínios de Negócio

### 4.1 Auth (`src/main/domains/auth/web-auth-service.ts`)

- Login contra a API cloud → recebe sessão (cookie/JWT).
- **Persistência**: `userData/web-auth-session.json` (arquivo em disco).
- **Validação no boot**: chama `/auth/me`; se expirou, limpa e força login.
- **Resolução de URL** (`resolveApiUrls`, linhas ~58-87):
  1. lê variáveis `DESKTOP_API_URL`, `WEB_API_URL`, `API_URL`, `VITE_API_URL`
  2. tenta concatenar com `WEB_APP_URL`
  3. **fallback hardcoded** para `http://64.181.188.115:3000`, `…/api`, `http://localhost:3000`, `http://localhost:8080/api`

### 4.2 Messages (`src/main/domains/messages/`)

- CRUD de templates (texto + imagem) por perfil.
- **Padrão dual de persistência**:
  - tenta rota nativa `/messages`
  - se 404, cai para `/quotes` com payload marcado como `desktop-whatsapp-message-v1`
- Inclui estado de "seleção" (qual template está armado para envio).

### 4.3 Price (`src/main/price/`)

- **Entrada**: seguradora, taxa, tipo (`quitado` vs `financiado`), dados do veículo.
- **Saída**: PNG na pasta Downloads.
- **Como funciona**: carrega template PNG (por seguradora) → desenha overlay com `@napi-rs/canvas` (fontes, números, campos) → salva.
- **Empacotamento**: assets ficam fora do ASAR (`asarUnpack` no `package.json`); resolução de caminho lida com `app.asar.unpacked`.

### 4.4 RTA (`src/main/rta/`)

- **Entrada**: ~25 campos (VIN, hodômetro, DOB do proprietário, lienholder, etc.).
- **Saída**: PDF preenchido na pasta Downloads.
- **Como funciona**: usa `pdf-lib` para abrir o template da seguradora correta e preencher campos por posição/nome.

### 4.5 Automation / WhatsApp (`src/main/automation/`)

Pipeline de envio em massa via Evolution API:

```
ProfileValidator → ChatProcessor → MessageSender
                                      ↓
                             Evolution API (Docker, :8080)
                                      ↓
                                 WhatsApp Web
```

- **`evolution/`**: cliente HTTP para Evolution API (QR-login, listar grupos, enviar texto/imagem).
- **`automation-controller.ts`**: orquestra o fluxo, emite eventos para o renderer (`events.ts`).
- **`browser-manager.ts`**: usa Playwright — código legado, **não é chamado pelo controller atual**.
- **`config.ts`**: timeouts, viewport, delays — configuração toda hardcoded.

### 4.6 Kanban (renderer + proxy `web-api`)

- View principal: `DesktopKanbanView.tsx` (1838 linhas), gerencia estado local de colunas/cards.
- **Sincronização**: usa `web-api:request` (proxy IPC) para chamar `/kanban`, `/vehicles`, `/quotes` na API cloud.
- Sem cache local; toda mudança é round-trip cloud.

---

## 5. IPC — Canais Expostos

Todos definidos em `src/main/ipc/*.ts` e expostos ao renderer via `src/preload/bridges/`.

| Canal | Origem | Função |
|---|---|---|
| `auth:login`, `auth:get-session`, `auth:logout`, `auth:validate-admin` | `auth-handlers.ts` | Login/sessão cloud |
| `automation:profiles`, `automation:start`, `automation:stop` | `automation-handlers.ts` | Controla bulk-send WhatsApp |
| `messages:get/add/update/delete/select` | `message-handlers.ts` | CRUD templates |
| `price:generate` | `price-handlers.ts` | Gera PNG de cotação |
| `rta:generate` | `rta-handlers.ts` | Gera PDF de RTA |
| `quotes:*` | `quotes-handlers.ts` | CRUD cotações |
| `web-api:request` | `web-api-handlers.ts` | **Proxy genérico** (whitelist: `/kanban`, `/vehicles`, `/quotes`, `/users`, `/messages`, `/profile`) |
| `files:*` | `file-handlers.ts` | Salvar arquivos via diálogo |
| `services:*` | `services-handlers.ts` | Camada legada |
| `app:recover-focus` | `app-handlers.js` | Hack `setAlwaysOnTop` para recuperar foco no Windows |

---

## 6. UI / Renderer

### Tecnologias

- **React 19** + **Tailwind 3.4** + PostCSS
- Fontes: Fraunces (600/700) e Manrope (400-800), via Google Fonts
- Dark mode via `ThemeProvider` (context)
- **Sem Redux/Zustand** — estado local + contexts

### Roteamento

`src/renderer/src/app/modules.ts` registra os módulos do menu lateral:

| Módulo | Ícone | Página | Admin? |
|---|---|---|---|
| Mensagens | 💬 | `pages/whatsapp/` | sim |
| Kanban | ▦ | `pages/kanban/DesktopKanbanView.tsx` | não |
| RTA | 📄 | `pages/rta/` | não |
| Preço | 🏷️ | `pages/price/` | não |
| Config | ⚙️ | `pages/settings/ConfigView.tsx` | sim |

### Contexts e Hooks

- `ProfileProvider` — perfis, login/logout, perfil selecionado.
- `ThemeProvider` — dark/light.
- `useAdminGate` — modal de senha admin por módulo restrito (re-pede a cada sessão).

### Páginas grandes

| Página | Linhas |
|---|---|
| `kanban/DesktopKanbanView.tsx` | 1838 |
| `whatsapp/ConfigView.tsx` | 609 |
| `settings/ConfigView.tsx` | 609 |
| `settings/ProfileSettingsView.tsx` | 203 |
| `whatsapp/WhatsAppAutomationControl.tsx` | 199 |

---

## 7. Persistência

| O que | Onde |
|---|---|
| Sessão de login | `userData/web-auth-session.json` (JSON em disco) |
| Templates, perfis, kanban, cotações | API cloud (`http://64.181.188.115:3000`) |
| PDFs e PNGs gerados | Pasta `Downloads` do SO |
| Banco local (SQLite/PouchDB) | **Não existe** — `src/main/infra/db/` está vazio |

---

## 8. Integrações Externas

### 8.1 Evolution API (WhatsApp)

- Stack Docker via `docker-compose.evolution.yml`.
- **Porta local**: 8080.
- **Banco**: Postgres em `64.181.188.115:5432/principal` (**compartilhado** com a API cloud).
- **Auth**: API key em `.env.evolution`.
- **Uso**: QR-code login, descoberta de grupos, envio de texto e imagem.

### 8.2 API Cloud REST

- Host: `http://64.181.188.115:3000` (IP público fixo).
- **Endpoints** usados pelo desktop:
  - `/auth/login`, `/auth/me`
  - `/messages` (ou fallback `/quotes` com marcador)
  - `/kanban`, `/vehicles`, `/quotes`, `/users`, `/profile`
- O backend cloud (`apps/api/`) tem schema Prisma definido, **mas pouca/nenhuma implementação de handlers REST** no repo — é, na prática, peso morto neste workspace.

### 8.3 GitHub Releases

- Canal de auto-update via `electron-updater`.
- Configurado em `electron.vite.config.ts` / `package.json`.

---

## 9. Build / Dev / Deploy

### Scripts (`package.json`)

```bash
npm run dev               # electron-vite dev
npm run build             # build cross-platform (eletron-vite + electron-builder)
npm run build:win         # ensure-win-native-deps + build NSIS x64
npm run build:mac         # generate-mac-icon + build DMG/zip universal
npm run build:linux       # build linux
npm run publish           # build:win + publish GitHub Release
npm run evolution:up      # docker compose up -d (WhatsApp)
npm run evolution:down
npm run evolution:logs
```

### Empacotamento (`electron-builder`)

- **appId**: `com.caslulu.insurancehelper`
- **asarUnpack**: `@napi-rs/canvas` (todas arquiteturas), `pdf-lib`, `playwright`, e assets de `src/main/price/assets` + `src/main/rta/assets`.
- **Windows**: NSIS (não one-click; instala em máquina, não per-user; cria shortcuts).
- **Mac**: DMG + zip, hardened runtime, `entitlements.mac.plist`.

### Scripts auxiliares

- `scripts/ensure-win-native-deps.js` — garante presença dos binários do `@napi-rs/canvas` para Windows antes de empacotar.
- `scripts/generate-mac-icon.js` — gera `build/icon.icns`.

---

## 10. Fluxo de Dados (alto nível)

```
┌──────────────────────────────────────────────────────────────────┐
│                         RENDERER (React)                          │
│  Sidebar → Páginas (Kanban, RTA, Preço, Mensagens, Config)       │
└──────────────────────────────┬───────────────────────────────────┘
                               │ window.api.<bridge>.<método>
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                  PRELOAD (contextBridge / IPC)                    │
│  bridges: automation, messages, rta, price, files, auth, web-api │
└──────────────────────────────┬───────────────────────────────────┘
                               │ ipcMain.handle
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                       MAIN (Node, src/main)                       │
│   handlers IPC → domains / price / rta / automation              │
└────────┬───────────┬───────────────┬──────────────┬──────────────┘
         │           │               │              │
         ▼           ▼               ▼              ▼
   Evolution API  API Cloud      pdf-lib       @napi-rs/canvas
   (Docker :8080) (:3000)        (RTA)         (price PNG)
         │           │               │              │
         ▼           ▼               ▼              ▼
   WhatsApp Web   Postgres       Downloads/    Downloads/
                  compartilhado  *.pdf         *.png
```

---

## Apêndice: arquivos de referência

| Tópico | Arquivo |
|---|---|
| Boot | `src/main/main.ts`, `src/main/core/app.ts`, `src/main/window-manager.ts` |
| Auth | `src/main/domains/auth/web-auth-service.ts` |
| Messages | `src/main/domains/messages/messages-service.ts` |
| WhatsApp | `src/main/automation/automation-controller.ts`, `src/main/automation/evolution/` |
| Price | `src/main/price/priceService.ts` |
| RTA | `src/main/rta/rtaService.ts` |
| IPC | `src/main/ipc/*.ts`, `src/preload/bridges/*.ts` |
| UI shell | `src/renderer/src/App.tsx`, `src/renderer/src/app/modules.ts` |
| Build | `electron.vite.config.ts`, `package.json` (campo `build`) |
| Docker | `docker-compose.evolution.yml`, `.env.evolution` |
