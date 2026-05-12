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

## Banco da parte web

Somente a estrutura de banco da antiga parte web foi mantida como referência em:

- `apps/api/prisma/`

A aplicação web em si não faz mais parte do fluxo operacional do desktop.

## Evolution API

Uso local via Docker Compose:

```bash
cp .env.evolution.example .env.evolution
npm run evolution:up
```

Stack local atual:

- `evolution-api`
- `principal-postgres` (banco principal do cliente)

Não existe mais container da aplicação web base e o Redis foi removido deste stack.

Se você já tiver um banco principal existente fora do compose, basta apontar
`DATABASE_CONNECTION_URI` para esse banco e remover o serviço `principal-postgres`
do compose (mantendo somente `evolution-api`).

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
