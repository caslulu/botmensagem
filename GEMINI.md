# Insurance Helper (botmensagem)

## What The Application Does Today

Insurance Helper is an Electron desktop application used to operate insurance workflows from a single interface. The current product combines:

- profile-based access and session reuse
- admin-only WhatsApp bulk messaging for archived chats
- RTA PDF generation
- quote queue management integrated with Trello
- insurance quote browser automation
- price image generation
- in-app onboarding/help content

## Current UI Modules

The renderer navigation is defined in `src/renderer/src/app/modules.ts`, not in the legacy service registry.

- `mensagens`: starts/stops WhatsApp automation, shows logs, manages saved messages
- `rta`: fills and exports RTA PDFs
- `cotacoes`: syncs Trello queue cards with local quotes, creates new cards, runs quote automation
- `price`: generates local PNG price cards from manual input or saved quotes
- `howto`: in-app usage guide
- `novidades`: in-app status/current-state panel
- `roadmap`: kanban board persisted locally
- `perfil`: edits the selected profile
- `config`: general settings plus full profile management for admins

## Important Product Truths

- Quote automation currently supports only `Progressive` and `Liberty`.
- RTA templates exist for `allstate`, `progressive`, `geico`, and `liberty`.
- The price renderer currently generates a local image in `Downloads`; the main-side service can attach to Trello only when called with a linked `cotacaoId`, which the current `PriceView` does not send.
- The quotes screen is the main Trello-facing workflow. There is no standalone Trello page in the sidebar.
- The WhatsApp automation is profile-driven and admin-gated.
- The current UI enforces up to 5 saved messages per profile and up to 10 profiles total.

## Architecture

### Main Process

`src/main/` owns:

- Electron lifecycle and window creation
- IPC handlers under `src/main/ipc/`
- SQLite persistence via `src/main/infra/db/sqlite.ts`
- WhatsApp and quote automations
- Trello integration
- RTA and price generation
- production auto-update wiring

### Renderer

`src/renderer/` is a React 19 app styled with Tailwind CSS. Most feature screens live under `src/renderer/src/pages/`.

### Preload

`src/preload/preload.ts` registers the secure `window.*` bridges. Keep renderer access inside these bridges instead of exposing Node APIs directly.

## Persistence And File Locations

- SQLite database: `userData/messages.db`
- WhatsApp sessions: `userData/sessions/<profileId>`
- copied profile images: `userData/profiles/`
- generated RTAs: `Downloads/rta-*.pdf`
- generated price images: `Downloads/*.png`

Primary tables:

- `profiles`
- `profile_settings`
- `profile_sessions`
- `messages`
- `quotes`
- `roadmap_items`

## Trello Configuration

The Trello service resolves credentials from:

1. process env
2. `src/main/config/trello-config.js`
3. `.env` / `trello.env` files found in supported search paths

Expected keys:

- `TRELLO_KEY`
- `TRELLO_TOKEN`
- `TRELLO_ID_LIST`
- `URL_TRELLO` optional

## Build And Runtime Notes

- `npm run dev` starts Electron Vite in development mode.
- `npm run build` packages the current platform.
- `npm run build:win`, `build:mac`, `build:linux`, `build:dir`, and `publish` are available.
- `npm test` is currently a placeholder and intentionally fails.
- Production uses `electron-updater` with GitHub Releases.

## Coding Guidance For This Repo

- Prefer the TypeScript source files over older CommonJS compatibility layers when both exist.
- Keep IPC pairs aligned:
  - preload bridge in `src/preload/bridges/*`
  - handler in `src/main/ipc/*`
- Reuse repository modules in `src/main/infra/db/` instead of bypassing them.
- Preserve profile/session semantics. Each profile maps to its own persistent session directory.
- When touching docs or onboarding content, include the in-app docs under:
  - `src/renderer/src/pages/howto/`
  - `src/renderer/src/pages/news/`

## Areas Most Likely To Drift

- product copy that still mentions a standalone Trello module
- docs that imply all price flows upload to Trello
- references to unsupported quote providers
- references to JS entry points where the repo now uses TS source
