# Insurance Helper

Aplicação de operação para seguros com dois ambientes: o desktop em Electron continua cuidando do WhatsApp, perfis e apoio operacional; a nova aplicação web cuida de RTA, Kanban de cotações e geração de imagens de preço.

## Estado Atual do Produto

### Módulos visíveis na interface

| Modulo | O que faz hoje | Observacoes |
| --- | --- | --- |
| `Enviar mensagem automática` | Dispara a mensagem selecionada para grupos arquivados do WhatsApp Web com logs em tempo real. | Somente perfis administradores podem iniciar o envio. |
| `App Web` | Abre o painel web local para RTA, Kanban de cotações e preço. | URL padrão: `http://localhost:8080`, configurável por `WEB_APP_URL`. |
| `Como usar` | Guia rápido de operação dentro do app. | Documentação interna. |
| `Novidades` | Painel de referência sobre o estado atual da aplicação. | Documentação interna. |
| `Roadmap` | Quadro kanban persistido em banco local. | Pode operar com seed inicial quando o banco esta vazio. |
| `Perfil` | Permite editar nome e avatar do perfil selecionado. | O ID do perfil e fixo. |
| `Configurações` | Mostra preferências gerais e, para admins, gerenciamento de todos os perfis. | Admins podem editar e excluir perfis não administradores. |

### Fluxos importantes

- **Perfis**: o app inicia com seed de perfis padrão e aceita até 10 perfis. Cada perfil possui sessão própria do WhatsApp.
- **Mensagens**: a interface permite manter até 5 mensagens salvas por perfil, com uma mensagem selecionada para envio.
- **WhatsApp**: a automação reutiliza a sessão do perfil, acessa chats arquivados e respeita o limite de envio configurado no perfil. O valor padrão é `200`.
- **App Web**: RTA, Kanban de cotações e preço rodam em React + Go + Postgres, com downloads servidos pelo navegador.
- **Kanban**: o quadro de cotações é próprio da aplicação, começa com `Cotações para fazer`, `Em cotação` e `Pronto`, e permite novas colunas.

## Arquitetura

### Camadas principais

- `src/main/`: processo principal do Electron, IPC, banco local, Playwright e automação do WhatsApp.
- `src/preload/`: bridges seguras expostas no `window.*`.
- `src/renderer/`: interface React 19 com Tailwind CSS.
- `apps/api/`: API Go com Postgres, geração de RTA, geração de preço, Kanban e downloads.
- `apps/web/`: aplicação React + Vite para RTA, Kanban de cotações e preço.

### Áreas relevantes do backend

- `src/main/automation/`: automação do WhatsApp Web e automação de cotações com Playwright.
- `src/main/trello/`, `src/main/price/`, `src/main/rta/`: código legado mantido no desktop, sem navegação principal.
- `src/main/infra/db/`: schema SQLite e repositorios.
- `src/main/ipc/`: handlers que ligam renderer e main.

### Persistência local

- Banco SQLite: `userData/messages.db`
- Sessões por perfil: `userData/sessions/<profileId>`
- Avatares copiados para user data: `userData/profiles/`
- Saídas web geradas:
  - Volume Docker `api_generated`
  - Downloads via endpoint `/files/:id/download`

As tabelas principais são:

- `profiles`
- `profile_settings`
- `profile_sessions`
- `messages`
- `quotes`
- `roadmap_items`

## Requisitos

- Node.js 18+
- npm 9+
- Docker para subir a API Go conteinerizada
- Navegadores do Playwright instalados quando necessário
- Chrome instalado, se você quiser usar o Chrome local; caso contrário o Playwright pode usar Chromium

## Configuração Local

### Diretórios opcionais

- `USER_DATA_DIR`: troca a pasta base usada para banco e arquivos locais
- `SESSIONS_ROOT`: troca a raiz das sessões do WhatsApp

## Desenvolvimento

```bash
npm install
npm run dev
```

### Aplicação web

```bash
npm --prefix apps/web install
npm run web:docker
```

Depois acesse:

- Web: `http://localhost:8080`
- API: `http://localhost:3000/health`

Os serviços Docker expõem portas somente em `127.0.0.1` por padrão.

Em banco novo, crie ou atualize o primeiro admin subindo a API com `ADMIN_EMAIL` e `ADMIN_PASSWORD` definidos. O binário Go faz um upsert desse usuário na inicialização.

Se precisar depurar Playwright:

```bash
PWDEBUG=1 npm run dev
```

Observações:

- `npm test` ainda não possui suite configurada e falha de propósito.
- A API web agora é compilada pelo Dockerfile Go em `apps/api/`; não há mais `npm install` dentro de `apps/api`.
- O app abre o DevTools automaticamente em ambiente de desenvolvimento.

## Build e Distribuição

### Comandos disponíveis

| Comando | Uso |
| --- | --- |
| `npm run build` | Gera build para a plataforma atual e executa o `electron-builder`. |
| `npm run build:win` | Build Windows x64 com preparação dos binários nativos. |
| `npm run build:mac` | Build universal para macOS. |
| `npm run build:linux` | Build Linux. |
| `npm run build:dir` | Build Windows x64 descompactado para testes. |
| `npm run publish` | Build Windows x64 e publicação via GitHub Releases. |

As saídas ficam em `dist/`.

### Atualização automática

Em produção, o app usa `electron-updater` apontando para releases do GitHub configuradas no `package.json`.

## Estrutura Resumida

```text
src/
  main/
    automation/
    infra/db/
    ipc/
  preload/
  renderer/
apps/
  api/
  web/
assets/
build/
scripts/
```

## Limitações e Observações

- A automação de cotação via Playwright permanece no desktop por enquanto.
- A web possui login interno por cookie HTTP-only; se expor fora da máquina, configure `AUTH_SECRET`, `WEB_ORIGIN` e transporte seguro.
- O Postgres web começa limpo e não importa automaticamente dados antigos do SQLite.
- O menu lateral usado pelo renderer está definido em `src/renderer/src/app/modules.ts`.

## Licença

ISC. Veja `LICENSE.txt`.
