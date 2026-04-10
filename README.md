# Insurance Helper

Aplicativo desktop em Electron para operar fluxos de seguros em uma interface única: disparo de mensagens pelo WhatsApp Web, geração de RTA em PDF, fila de cotações integrada ao Trello, geração de imagens de preço e administração de perfis.

## Estado Atual do Produto

### Módulos visíveis na interface

| Modulo | O que faz hoje | Observacoes |
| --- | --- | --- |
| `Enviar mensagem automática` | Dispara a mensagem selecionada para grupos arquivados do WhatsApp Web com logs em tempo real. | Somente perfis administradores podem iniciar o envio. |
| `RTA automático` | Preenche templates PDF e salva o arquivo final na pasta Downloads. | Templates disponíveis para `allstate`, `progressive`, `geico` e `liberty`. |
| `Cotações` | Sincroniza a fila do Trello com o espelho local no banco, cria cards novos e permite iniciar automação de cotação. | A automação atual suporta apenas `Progressive` e `Liberty`. |
| `Preço automático` | Gera imagens PNG com base em uma cotação salva ou em preenchimento manual. | A tela atual gera o arquivo localmente em Downloads. |
| `Como usar` | Guia rápido de operação dentro do app. | Documentação interna. |
| `Novidades` | Painel de referência sobre o estado atual da aplicação. | Documentação interna. |
| `Roadmap` | Quadro kanban persistido em banco local. | Pode operar com seed inicial quando o banco esta vazio. |
| `Perfil` | Permite editar nome e avatar do perfil selecionado. | O ID do perfil e fixo. |
| `Configurações` | Mostra preferências gerais e, para admins, gerenciamento de todos os perfis. | Admins podem editar e excluir perfis não administradores. |

### Fluxos importantes

- **Perfis**: o app inicia com seed de perfis padrão e aceita até 10 perfis. Cada perfil possui sessão própria do WhatsApp.
- **Mensagens**: a interface permite manter até 5 mensagens salvas por perfil, com uma mensagem selecionada para envio.
- **WhatsApp**: a automação reutiliza a sessão do perfil, acessa chats arquivados e respeita o limite de envio configurado no perfil. O valor padrão é `200`.
- **Cotações**: a tela consulta a lista `COTAÇÕES PARA FAZER` do board `Auto Insurance 2`, combina esses cards com o banco local e exibe tudo em um único painel.
- **Preço**: o serviço sabe anexar a imagem em um card do Trello quando recebe `cotacaoId`, mas a tela atual `Preço automático` não envia esse campo; por isso, hoje o fluxo dessa tela é local.
- **RTA**: o PDF final sempre e salvo em `Downloads`, com o template selecionado a partir da seguradora informada.

## Arquitetura

### Camadas principais

- `src/main/`: processo principal do Electron, IPC, banco local, Playwright, Trello, RTA e geração de preço.
- `src/preload/`: bridges seguras expostas no `window.*`.
- `src/renderer/`: interface React 19 com Tailwind CSS.

### Áreas relevantes do backend

- `src/main/automation/`: automação do WhatsApp Web e automação de cotações com Playwright.
- `src/main/trello/`: criação, leitura, exclusão e anexos de cards.
- `src/main/price/`: geração de imagens e repositório de cotações.
- `src/main/rta/`: preenchimento e exportação de PDFs.
- `src/main/infra/db/`: schema SQLite e repositorios.
- `src/main/ipc/`: handlers que ligam renderer e main.

### Persistência local

- Banco SQLite: `userData/messages.db`
- Sessões por perfil: `userData/sessions/<profileId>`
- Avatares copiados para user data: `userData/profiles/`
- Saídas geradas:
  - `Downloads/rta-*.pdf`
  - `Downloads/quitado-*.png`
  - `Downloads/financiado-*.png`

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
- Navegadores do Playwright instalados quando necessário
- Chrome instalado, se você quiser usar o Chrome local; caso contrário o Playwright pode usar Chromium
- Credenciais do Trello configuradas para os fluxos que dependem de board/cards

## Configuração Local

### Trello

O app procura credenciais nesta ordem:

1. Variaveis de ambiente do processo
2. `src/main/config/trello-config.js`
3. Arquivos `.env` ou `trello.env` em caminhos conhecidos

Copie o exemplo e preencha os valores reais:

```bash
cp src/main/config/trello-config.example.js src/main/config/trello-config.js
```

Chaves esperadas:

- `TRELLO_KEY`
- `TRELLO_TOKEN`
- `TRELLO_ID_LIST`
- `URL_TRELLO` opcional, com padrão para a API oficial

### Diretórios opcionais

- `USER_DATA_DIR`: troca a pasta base usada para banco e arquivos locais
- `SESSIONS_ROOT`: troca a raiz das sessões do WhatsApp

## Desenvolvimento

```bash
npm install
npm run dev
```

Se precisar depurar Playwright:

```bash
PWDEBUG=1 npm run dev
```

Observações:

- `npm test` ainda não possui suite configurada e falha de propósito.
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
    price/
    rta/
    trello/
  preload/
  renderer/
assets/
build/
scripts/
```

## Limitações e Observações

- A automação de cotações hoje suporta somente `Progressive` e `Liberty`.
- `Allstate`, `Geico`, `Direct` e `StateFarm` aparecem no módulo de preço como marca exibida na imagem, mas não possuem automação de cotação neste momento.
- O módulo `Preço automático` gera a imagem localmente; anexar no Trello depende de um fluxo que envie `cotacaoId`.
- O menu lateral usado pelo renderer está definido em `src/renderer/src/app/modules.ts`.

## Licença

ISC. Veja `LICENSE.txt`.
