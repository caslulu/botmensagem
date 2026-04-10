ARQUIVOS DE BUILD
=================

Esta pasta é usada pelo `electron-builder` como `buildResources`.

Arquivos mais importantes:

- `build/icon.ico`
  Usado no build do Windows. O formato deve ser `.ico`.

- `build/icon.icns`
  Recomendado para builds de macOS feitos com `npm run build:mac`.

- `build/entitlements.mac.plist`
  Arquivo referenciado pela configuração de macOS no `package.json`.

Recomendações para o ícone do Windows:

- 256x256 ou 512x512 pixels
- múltiplos tamanhos internos ajudam no sistema operacional
- incluir pelo menos 16, 32, 48 e 256 px

Ferramentas úteis:

- https://www.icoconverter.com/
- https://cloudconvert.com/png-to-ico
- https://converticon.com/

Observações:

- Se `icon.ico` não existir, o Electron pode usar um ícone padrão.
- Para macOS, o formato recomendado é `.icns`, não `.ico`.
