# GitHub Copilot Instructions

These instructions describe how code suggestions should align with the current application, not with older product assumptions.

## Product Context

This repository contains an Electron desktop application used to operate insurance workflows. The current system includes:

- profile selection and profile administration
- admin-only WhatsApp automation for archived chats
- RTA PDF generation
- quote queue management synced with Trello
- quote browser automation
- price image generation
- in-app help, news, and roadmap screens

## Current Module Map

The sidebar used by the renderer is defined in `src/renderer/src/app/modules.ts`.

- `mensagens`: WhatsApp automation and message management
- `rta`: RTA PDF generation
- `cotacoes`: Trello queue + local quote mirror + quote automation
- `price`: local price image generation
- `howto`: usage guide
- `novidades`: current-state/news content
- `roadmap`: kanban board
- `perfil`: selected profile settings
- `config`: general settings and admin profile management

Do not assume there is a separate Trello page in the visible navigation. Trello UI lives mainly inside the quotes flow via `src/renderer/src/pages/trello/components/TrelloForm.tsx`.

## Key Behavior Constraints

- Quote automation currently supports only `Progressive` and `Liberty`.
- RTA supports templates for `allstate`, `progressive`, `geico`, and `liberty`.
- The `PriceView` currently generates a local image and does not pass `cotacaoId`, so that UI flow does not upload to Trello.
- WhatsApp automation can only be started by admin profiles.
- The UI currently allows up to 10 profiles and up to 5 saved messages per profile.
- The default WhatsApp send limit is `200`.

## Stack And Architecture

1. Stack:
   - Electron 39
   - React 19 + Tailwind CSS
   - Playwright for browser automation
   - SQLite via `sql.js`
   - `pdf-lib` for RTA generation
2. Main process:
   - lifecycle, IPC, persistence, Trello, automation, file generation
3. Renderer:
   - React pages under `src/renderer/src/pages/`
4. Preload:
   - secure `window.*` bridges registered in `src/preload/preload.ts`

## Source-Of-Truth Paths

- Main entry: `src/main/main.ts`
- Window/bootstrap: `src/main/core/app.ts`, `src/main/window-manager.ts`
- Database schema: `src/main/infra/db/sqlite.ts`
- IPC registration: `src/main/ipc/index.ts`
- Quote automation service: `src/main/automation/quotes/quote-automation-service.js`
- Trello service: `src/main/trello/services/trelloService.ts`
- In-app docs: `src/renderer/src/pages/howto/`, `src/renderer/src/pages/news/`

## Development Guidelines

### Electron Security And IPC

- Keep `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`
- Add new renderer capabilities through preload bridges plus IPC handlers
- Prefer structured responses through `src/main/utils/result.js`

### Persistence

- Use the repository layer under `src/main/infra/db/`
- Keep generated data under user data or Downloads, following existing services
- Preserve per-profile session directories via `src/main/automation/utils/path-resolver.ts`

### React And Renderer Code

- Shared components belong under `src/renderer/src/components/`
- Feature-specific UI should stay close to its page folder
- Prefer typed props and predictable state flows
- Do not introduce a new navigation source of truth when `DEFAULT_MODULES` already owns the sidebar

### Automation Features

- New quote providers belong under `src/main/automation/quotes/providers/`
- Keep provider mapping explicit in the quote automation service
- WhatsApp automation changes should preserve the current profile/session model

### Configuration And Secrets

- Trello credentials come from env or `src/main/config/trello-config.js`
- Never hardcode secrets
- Keep secret-bearing files out of version control

### Tests And Quality

- There is no configured automated test suite today; do not assume Jest/Vitest is already wired
- If adding tests, keep them scoped and consistent with the repo
- Prefer actionable errors surfaced to the renderer

### Documentation

- When product behavior changes, update both repo docs and in-app docs
- Treat these as documentation surfaces:
  - `README.md`
  - `GEMINI.md`
  - `src/renderer/src/pages/howto/components/HowToGuide.tsx`
  - `src/renderer/src/pages/news/NewsView.tsx`
