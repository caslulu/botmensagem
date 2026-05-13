# Insurance Helper

Aplicação 100% desktop para operação de seguros.

## Estado Atual

A interface principal voltou para o desktop com estes módulos:

- `Mensagens` (automação de WhatsApp)
- `Cotação`
- `Kanban`
- `RTA`
- `Preço`
- `Perfil` e `Configurações`

## Arquitetura

- `src/main/`: processo principal do Electron, IPC, automações e banco local.
- `src/preload/`: bridges seguras expostas no `window.*`.
- `src/renderer/`: interface React.
- `src/main/infra/db/`: persistência SQLite local.

### Kanban e Login (Cloud)

- O login do desktop usa autenticação cloud (`desktopAuth`) e sessão por cookie.
- O Kanban do desktop usa a API cloud (`desktopWebApi`) para ler/escrever no banco cloud.
- O desktop continua sendo a interface principal para operar os módulos.

Integrações do fluxo:

- Card do Kanban pode iniciar automação de cotação.
- Resultados de preço/cotação refletem no card.
- RTA e Preço são gerados no desktop.

## API e Banco (Cloud)

Somente a API e a estrutura de banco cloud foram mantidas como referência em:

- `apps/api/prisma/`

## Evolution API

Uso local via Docker Compose:

```bash
cp .env.evolution.example .env.evolution
npm run evolution:up
```

Stack local atual:

- `evolution-api`

Não existe mais container de frontend nesse compose, nem Postgres dentro deste stack, e o Redis foi removido.

O `evolution-api` deve apontar para o banco principal compartilhado via
`DATABASE_CONNECTION_URI` no arquivo `.env.evolution`.

Comandos úteis:

- `npm run evolution:logs`
- `npm run evolution:down`

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build

- `npm run build`
- `npm run build:win`
- `npm run build:mac`
- `npm run build:linux`
