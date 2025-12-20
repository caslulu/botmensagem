# Modularização da base

## Objetivos
- Separar responsabilidades entre **main process**, **preload** e **renderer**.
- Domínios explícitos (automation, profiles, messages, trello, quotes, price, rta, files/services).
- IPC tipado e previsível, sem expor APIs genéricas no preload.
- Reaproveitar infra compartilhada (logger, path resolver, db) em camadas próprias.
- Renderer organizado em feature folders com componentes compartilhados em `shared/`.

## Estrutura alvo (alto nível)
```
src/
  main/
    core/              # bootstrap, app lifecycle, window manager wiring
    ipc/               # registradores IPC por domínio
    domains/
      automation/
      messages/
      profiles/
      trello/
      quotes/
      price/
      rta/
      files/          # salvar/abrir arquivos
    infra/
      db/             # instancia sql.js e repositórios por tabela
      logging/
      fs/
      config/
  preload/
    bridges/           # um bridge por domínio
    preload.js         # orquestra bridges
  renderer/
    src/
      app/             # shell, theme, providers
      features/
        automation/
        rta/
        trello/
        quotes/
        price/
        profile/
        howto/
      shared/
        ui/
        hooks/
        libs/
      styles/
```

## IPC e Preload
- Um bridge por domínio (`automationBridge`, `profileBridge`, `trelloBridge`, etc.) registrado em `preload/preload.js`.
- Contratos IPC simples: `channel:action` → payload DTO → resposta `{ success, data?, error? }`.
- Tipos expostos em `renderer/src/global.d.ts` para cada bridge.

## Main process
- `core/app.js`: inicializa app, cria janela, chama registradores IPC, conecta events.
- `core/ipc-loader.js`: registra handlers passando dependências (services/repositories).
- `domains/*`: serviços e orquestradores específicos (ex.: automation controller, price service, rta service).
- `infra/db`: `sql.js` singleton + repositórios (`profilesRepository`, `messagesRepository`, `quotesRepository`, `sessionsRepository`, `profileSettingsRepository`).
- `infra/logging`: logger compartilhado.
- `infra/fs`: path resolver, validação de arquivos.

## Renderer
- `app/` contém layout base, roteamento/tab navigation, providers (perfil, tema, serviços).
- `features/*` contém páginas e componentes específicos por domínio.
- `shared/ui` para botões, modais, cards; `shared/hooks` para hooks de IPC/tema; `shared/libs` para utils puros.

### Providers / hooks implementados
- `ThemeProvider`: controla `isDarkMode` e `toggleTheme`, aplicando/removendo a classe `dark` no `document.documentElement`.
- `ProfileProvider`: centraliza `profiles`, `selectedProfileId`, `reloadProfiles()`, `createProfile()`, `updateProfile()` via preload `window.profile.*`, e expõe estado para views.
- `useAdminGate`: controla navegação entre módulos com proteção de admin/password, gerencia permissões temporárias e modal de senha.
- Views migradas para `features/*` por domínio (whatsapp, rta, trello, quotes, price, howto) para reduzir acoplamento com `components/modules`.
- Messages IPC agora retornam envelopes `{ success, messages }` e o renderer trata erros/sucessos explicitamente.

### Próximos passos do renderer
- Criar `shared/ui` com botões, modais e shells reutilizáveis; substituir imports locais conforme migrados.
- Adicionar smoke tests de IPC para messages/price/trello/quotes e para o hook `useAdminGate`.
- Revisar chamadas IPC restantes para seguir `{ success, data?, error? }` e tipar no renderer.
- Atualizar README/guia de dev com nova estrutura `features/*` e contratos IPC.

## Fases sugeridas
1) Infra e preload: quebrar preload em bridges, adicionar typings, manter canais existentes.
2) Main: mover bootstrap para `core/`, separar registradores IPC e serviços por domínio (mínimo: automation, profiles, messages, trello, price, rta, quotes, files).
3) DB: extrair repositórios de `database.js` (profiles, messages, settings, quotes, sessions) e atualizar services/handlers.
4) Renderer: criar `features/` e migrar telas atuais, manter comportamento; adicionar providers compartilhados para perfil e tema.
5) Limpeza e testes: ajustar configs, rodar build, criar smoke tests de IPC/repositórios.
```