# Como Gerar o Executável para Windows

## 📦 Gerar o Instalador

Execute o comando:

```bash
npm run build
```

Isso irá:
1. Compilar os estilos CSS
2. Empacotar toda a aplicação (Node.js, Chromium, dependências)
3. Criar um instalador Windows (.exe)

## 📁 Onde encontrar o instalador

Após o build, o instalador estará em:

```
dist/Insurance Helper Setup 1.0.0.exe
```

## 🎁 Entregar para o Cliente

1. Envie o arquivo `.exe` para o cliente
2. Cliente executa o instalador
3. Segue o assistente de instalação (pode escolher o diretório)
4. Pronto! O ícone aparecerá na Área de Trabalho e Menu Iniciar
5. Copie o arquivo `.env` com as credenciais (ou `trello.env`) para o diretório de instalação se precisar atualizar os dados depois

## ⚙️ O que está incluído no instalador

✅ **Tudo empacotado!** O cliente não precisa instalar:
- Node.js
- Chromium (para Playwright)
- Todas as dependências npm
- Banco de dados SQLite
- Imagens padrão

## 📝 Notas Importantes

- **Tamanho**: O instalador terá ~200-300 MB (normal, inclui Chromium completo)
- **Primeira execução**: Playwright pode baixar o navegador na primeira vez
- **Requisitos**: Windows 10/11 64-bit
- **Desinstalação**: Via Painel de Controle > Programas

## 🔧 Testar antes de entregar

Execute o build em modo diretório para testar:

```bash
npm run build:dir
```

Isso cria uma pasta `dist/win-unpacked` com a aplicação sem instalar.
Execute: `dist/win-unpacked/Insurance Helper.exe`
Copie o `.env` (ou `trello.env`) para essa pasta antes de iniciar o executável para validar o acesso ao Trello.

## 🎨 Personalizar

### Ícone
Coloque um arquivo `icon.ico` (256x256 ou 512x512) em `build/icon.ico`

### Versão
Altere `version` no `package.json`

### Nome
Altere `productName` na seção `build` do `package.json`
