# Insurance Helper

Aplicativo desktop em Electron para orquestrar automações de seguro: geração de RTA em PDF, cotações automáticas (Progressive/Liberty) e formulários de preço, com interface React/Tailwind e back-end Playwright/Node.

## Visão Geral

- **Automação de Cotações**: Playwright abre e preenche fluxos de seguradoras (Progressive e Liberty), com opção de `pause` para inspeção/manual.
- **RTA em PDF**: Preenchimento de templates PDF via `pdf-lib`, salvando na pasta Downloads do usuário.
- **Formulário de Preço**: Gestão de cotações salvas e execução de automação por seguradora.
- **Mensageria**: Infra de automação e formatação permanece, mas foco atual é fluxo de seguros.
- **Desktop**: Electron 39 + React 19 + Tailwind; Playwright 1.56 para automação; SQLite via `sql.js`.

## Requisitos

- Node.js 18+ e npm 9+
- Playwright browsers instalados (`npx playwright install` se necessário)
- Chrome instalado (opcional; se não, usa Chromium do Playwright)
- Windows/macOS para desenvolvimento; build configurado para Windows x64.

## Desenvolvimento

```bash
npm install
npm run dev           # electron-vite em modo dev (abre renderer + main)
# opcional: PWDEBUG=1 npm run dev  # abre inspector do Playwright quando pause for usado
```

Automação com pausa (exemplo no renderer/preload):

```js
await window.quotes.runAutomation({
	quoteId: 'ID',
	insurer: 'liberty',
	headless: false,
	pause: true
});
```

## Build / Distribuição

```bash
npm run build         # build + electron-builder (Windows x64)
npm run build:dir     # build descompactado para testes
npm run build:linux   # build Linux (quando aplicável)
```

Saídas ficam em `dist/`. Inclui app, Chromium/Playwright e dependências.

## Estrutura (resumo)

- `src/main/` — processo principal do Electron (IPC, automações Playwright, RTA, preço/quotes)
- `src/preload/` — bridge segura exposta no `window.*` (quotes, price, files, etc.)
- `src/renderer/` — React + Tailwind (componentes de cotações, RTA, UI geral)
- `data/` — artefatos locais (dev); builds usam `app.getPath('userData')`

## Automação de Cotações (Playwright)

- **Progressive**: fluxo completo automatizado.
- **Liberty**: fluxo em evolução; suporta `pause` para inspeção, preenchimento de nome/endereço, telefone mock US e decisões de seguro atual (Yes/No) a partir do payload.
- Chamadas: `window.quotes.runAutomation({ quoteId, insurer, headless, pause })`.

## RTA (PDF)

- Templates em `src/main/rta/assets/`.
- Preenchimento via `pdf-lib`; saída na pasta Downloads (`app.getPath('downloads')`).

## Suporte / Issues

- Bugs ou melhorias: [Issues](https://github.com/caslulu/botmensagem/issues)

## Licença

ISC — veja [LICENSE.txt](LICENSE.txt)
