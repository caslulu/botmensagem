# Pontos Fracos e Simplificações Propostas

Relatório de lógica complexa desnecessária e código morto no `botmensagem`. Premissas:

- App interno, **2 usuários**.
- Segurança **não é foco** — não precisa de defesa contra entrada maliciosa, sanitização defensiva ou múltiplos fallbacks "para o caso de".
- Objetivo: reduzir superfície de código, simplificar deploy e tornar manutenção mais rápida.

Pareado com [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Status da Implementação

| Item | Status |
|---|---|
| Apagar pastas/arquivos mortos (`trello`, `pages/trello`, `pages/web`, `infra/db`, `config`, `constants`) | ✅ feito |
| Remover `bootstrap.ts` no-op | ✅ feito |
| Remover automation Playwright dead code (`browser-manager`, `whatsapp-service`, `chat-processor`, `message-sender`) | ✅ feito |
| Remover `services-handlers` + `service-registry` + bridge `services` | ✅ feito |
| Simplificar `messages-service` (eliminado fallback `/quotes` e `requestWithFallback`) | ✅ feito |
| Remover `useAdminGate` + `AdminPasswordModal` | ✅ feito |
| Consolidar IP hardcoded | ⏸️ adiado por decisão do usuário |
| Quebrar `DesktopKanbanView.tsx` (1838 linhas) | 🟡 pendente (risco alto sem testes visuais) |
| Quebrar `ConfigView` × 2 (609 linhas cada) | 🟡 pendente |
| Trocar `@napi-rs/canvas` por HTML→PNG | 🟡 pendente (precisa validar render visual) |
| `web-api:request` → handlers tipados | 🟡 pendente (mecânico, mas toca muitos callsites do renderer) |
| Decidir destino de `apps/api/` | ⏸️ decisão de produto |

Build (`electron-vite build`) verificado limpo após mudanças.

---

## Resumo Executivo (original)

| # | Item | Esforço | Impacto |
|---|---|---|---|
| **Quick wins** (1 hora cada, baixíssimo risco) | | | |
| 1 | Deletar `src/main/trello/` (subpastas vazias) | trivial | limpeza |
| 2 | Deletar `src/renderer/src/pages/trello/` e `pages/web/` | trivial | limpeza |
| 3 | Remover Playwright se não é usado | baixo | ~150 MB no instalador |
| 4 | Consolidar IP `64.181.188.115` em 1 `.env` | baixo | operação |
| 5 | Reduzir 6 URLs de fallback para 1 | baixo | clareza |
| **Estruturais** (refactor planejado) | | | |
| 6 | Remover fallback dual `/messages` → `/quotes` | médio | clareza |
| 7 | Quebrar `DesktopKanbanView.tsx` (1838 linhas) | alto | manutenção |
| 8 | Trocar `@napi-rs/canvas` por HTML→PNG | médio | build mais simples |
| 9 | Decidir destino de `apps/api/` | médio | clareza do repo |

---

## A. Código Morto / Não Utilizado

### 1. `src/main/trello/` — pastas vazias

```
src/main/trello/
├── services/   (vazia)
└── utils/      (vazia)
```

**Proposta**: deletar a pasta inteira. Não há arquivo, não há import.

---

### 2. `src/renderer/src/pages/trello/` e `pages/web/`

- `pages/trello/components/` está vazia.
- `pages/web/` está vazia.
- Resíduo de uma interface web abandonada (também há `services-handlers.ts` chamado de "services" no IPC, ver item 10).

**Proposta**: deletar.

---

### 3. Playwright importado sem uso real

**Arquivo**: `src/main/automation/browser-manager.ts`

O `automation-controller.ts` atual usa a Evolution API (HTTP). O `browser-manager.ts` mantém código baseado em Playwright (browser automation direto no WhatsApp Web), mas não é mais chamado no fluxo principal.

**Custo**: Playwright + chromium pesam ~150 MB no instalador (`asarUnpack` os inclui).

**Proposta**: confirmar com o time que Playwright não é fallback real → remover `browser-manager.ts` + dependência `playwright` do `package.json` + entradas correspondentes em `asarUnpack`.

---

### 4. `apps/api/` — backend cloud incompleto

A pasta tem schema Prisma (User, KanbanColumn, KanbanCard, QuotePrice, FileAsset, RTA) mas **sem handlers REST implementados** no repo. A API que o desktop consome está em outro lugar (servidor `64.181.188.115`).

**Decisão necessária**:

- **Se o backend cloud é mantido em outro repo**: deletar `apps/api/` daqui.
- **Se a intenção era trazer o backend para este monorepo**: terminar a implementação ou anotar isso no `apps/api/README.md`.

Hoje é puro ruído no `find`/grep do projeto.

---

### 5. Pastas/arquivos vazios diversos

- `src/main/infra/db/` — vazia (não há banco local).
- `src/main/config/` — vazia (config real está em `automation/config.ts`).
- `src/main/constants/profile.js` — 102 bytes, marcador sem uso real.
- `src/main/bootstrap.ts` — `export async function bootstrap() {}` vazio, mantido por "compatibilidade".

**Proposta**: deletar diretamente. Se houver algum import morto, o TypeScript/build vai acusar.

---

### 6. `services-handlers.ts` / `service-registry.js`

Resíduo de uma camada de "services" mais antiga. O IPC tem `services:*` mas o fluxo principal não passa por ali.

**Proposta**: auditar uso real no renderer e remover se ninguém chama.

---

## B. Configuração Frágil / Hardcoded

### 7. IP público `64.181.188.115` hardcoded

**Ocorrências**:

| Arquivo | Linha |
|---|---|
| `src/main/domains/auth/web-auth-service.ts` | 82 |
| `src/main/domains/auth/web-auth-service.ts` | 83 |
| `.env.evolution` | SERVER_URL e DATABASE_CONNECTION_URI |

**Problema**: trocar de servidor exige caçar strings em código compilado dentro do `asar`.

**Proposta**: 1 variável `API_URL` em `.env` (carregado pelo Electron no boot) e nada hardcoded. Para 2 usuários, manter um `.env` por máquina (ou no instalador) é suficiente.

---

### 8. 6 URLs de fallback em `web-auth-service.ts`

**Trecho** (`web-auth-service.ts:58-87`):

```ts
function resolveApiUrls(): string[] {
  // … lê DESKTOP_API_URL, WEB_API_URL, API_URL, VITE_API_URL, WEB_APP_URL
  urls.push('http://64.181.188.115:3000');
  urls.push('http://64.181.188.115/api');
  urls.push('http://localhost:3000');
  urls.push('http://localhost:8080/api');
  return uniqueValues(urls);
}
```

E depois itera tentando cada URL até alguma responder.

**Problema**: over-defensivo para uso interno. Quando dá problema, esconde a causa real (URL errada vira "loading infinito").

**Proposta**:

```ts
function getApiUrl(): string {
  const url = process.env.API_URL?.trim();
  if (!url) throw new Error('API_URL não configurada');
  return url.replace(/\/+$/, '');
}
```

Falha rápida, mensagem clara.

---

### 9. Fallback dual `/messages` → `/quotes` em messages-service

**Arquivo**: `src/main/domains/messages/messages-service.ts`

A camada de mensagens tenta a rota nativa `/messages` e, se receber 404, persiste no endpoint `/quotes` com payload marcado como `desktop-whatsapp-message-v1`. É uma estratégia de "graceful degradation" para variações de API.

**Problema**: dobra o código, dobra os bugs possíveis, e torna difícil saber onde o dado realmente vive. Para 2 usuários e 1 backend, escolher um endpoint resolve.

**Proposta**: padronizar no `/messages`. Se a API cloud não tem essa rota ainda, decidir e implementar — não manter dois caminhos vivos.

---

## C. Componentes Inchados

### 10. `DesktopKanbanView.tsx` — 1838 linhas

Uma única view com:

- Estado de colunas + cards
- Modais de edição
- Lógica de drag-and-drop
- Sincronização com `web-api:request`
- Renderização visual

**Proposta**: extrair pelo menos:

```
kanban/
├── DesktopKanbanView.tsx       # shell, layout, providers
├── components/
│   ├── KanbanColumn.tsx
│   ├── KanbanCard.tsx
│   └── CardEditModal.tsx
└── hooks/
    ├── useKanbanData.ts        # fetch + estado dos cards
    └── useCardDrag.ts          # DnD
```

Hoje qualquer mudança força carregar o arquivo inteiro na cabeça.

---

### 11. `whatsapp/ConfigView.tsx` e `settings/ConfigView.tsx` — 609 linhas cada

Mesmo problema em menor escala. Extrair seções de configuração em componentes (`AuthSection`, `MessageTemplatesSection`, `AdminSection`, etc.).

---

### 12. `web-api:request` como proxy genérico

**Arquivo**: `src/main/ipc/web-api-handlers.ts`

Hoje funciona assim:

```ts
// renderer
window.api.webApi.request('/kanban', { method: 'GET' });

// main valida contra whitelist e repassa
```

**Problema**:

- "String-typed": qualquer typo no path do renderer só falha em runtime.
- Schema do payload mora no renderer e no servidor; o desktop não tem visão dos tipos.
- Tornar um endpoint novo disponível exige edição em 2 lugares (whitelist + chamada).

**Proposta**: handlers nomeados por endpoint (já é o padrão para `messages:*`, `price:*`, etc.):

```ts
// preload
window.api.kanban.list();
window.api.kanban.update(card);
window.api.vehicles.get(id);
```

Cada um com tipo TS no contrato. Continua sendo "passa pro cloud", mas com superfície tipada.

---

## D. Possíveis Simplificações Arquiteturais

### 13. `@napi-rs/canvas` para gerar price cards

**Por que existe**: desenhar texto e overlay sobre um template PNG.

**Custo atual**:

- Dependência nativa por plataforma (`@napi-rs/canvas-darwin-x64`, `…-darwin-arm64`, `…-win32-x64-msvc`).
- `asarUnpack` específico no `package.json`.
- `scripts/ensure-win-native-deps.js` existe porque essa lib quebra empacotamento.

**Proposta**: trocar por uma das alternativas:

- Renderizar um HTML/SVG no próprio renderer, capturar com `webContents.capturePage()` ou `canvas` do navegador.
- `electron.webContents.printToPDF` se PDF for aceitável.

Em ambos os casos: zero dependência nativa, build muito mais simples, e o "designer" do template vira HTML/CSS — mais fácil de iterar.

---

### 14. Postgres compartilhado entre Evolution API e backend cloud

**Arquivo**: `.env.evolution`

```
DATABASE_CONNECTION_URI=postgresql://postgres:postgres@64.181.188.115:5432/principal
```

A Evolution API escreve no **mesmo banco** que a API cloud. Acopla dois sistemas que não precisam saber um do outro.

**Proposta**: Evolution com seu próprio Postgres em volume Docker. A API cloud fica isolada e migrações em um sistema não quebram o outro.

---

### 15. `useAdminGate` — senha admin por sessão por módulo

Para 2 usuários, ter que digitar senha admin ao entrar em "Mensagens" e de novo em "Config" é fricção sem ganho real (segurança não é foco).

**Proposta**: 1 senha no boot (ou nem isso). Remover o modal por módulo.

---

### 16. Hack `app:recover-focus` no Windows

`src/main/ipc/app-handlers.js` expõe um IPC que faz `setAlwaysOnTop(true)` → `setAlwaysOnTop(false)` para "recuperar foco" no Windows.

**Proposta**: documentar no código qual bug isso resolve (link para issue do Electron ou repro), ou testar se ainda é necessário em versões atuais do Electron e remover.

---

## E. Pequenos Cheiros

### 17. `bootstrap.ts` vazio

```ts
export async function bootstrap() {}
```

Mantido "por compatibilidade" sem ninguém consumindo. Inline ou delete.

---

### 18. `scripts/ensure-win-native-deps.js`

Existe **só** porque o `@napi-rs/canvas` complica o empacotamento. Resolve-se removendo a dependência nativa (item 13).

---

### 19. `automation/config.ts` 100% hardcoded

Timeouts, viewport, delays — tudo em constantes no código. Para 2 usuários, é OK na real. Só vale citar para que um futuro "vamos parametrizar" não vire over-engineering: deixar hardcoded e ajustar no código quando precisar é a escolha certa aqui.

---

## Ordem Sugerida de Ataque

Se quiser executar em fases:

1. **Limpeza (1 dia)**: itens 1, 2, 5, 7, 8, 17 — deletar código morto, consolidar IP, simplificar auth fallback. Risco quase nulo.
2. **Decisão de produto (1 reunião)**: itens 4 (apps/api), 3 (Playwright). Confirmar que ninguém usa antes de remover.
3. **Refactor de UI (1 semana)**: itens 10, 11. Quebrar componentes grandes.
4. **Refactor de plataforma (1-2 semanas)**: itens 6 (mensagens dual), 12 (IPC tipado), 13 (canvas → HTML).
5. **Tocar só se incomodar**: 14, 15, 16.

---

## O que **não** vale mexer

- **`automation/config.ts` hardcoded** (item 19) — para 2 usuários é OK.
- **Sem banco local** — depender do cloud está coerente com o uso. Não introduzir SQLite "por desencargo".
- **`electron-updater` via GitHub Releases** — funciona e é simples. Manter.
- **Tailwind + React** — stack consistente, sem fricção.
