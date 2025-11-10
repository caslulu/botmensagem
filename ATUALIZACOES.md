# Guia de Atualizações Automáticas

## Como Publicar Atualizações

O sistema agora possui atualização automática via GitHub Releases. Quando você publicar uma nova versão, os clientes receberão automaticamente uma notificação para atualizar.

### Pré-requisitos

1. **GitHub Personal Access Token**
   - Acesse: https://github.com/settings/tokens
   - Clique em "Generate new token (classic)"
   - Dê um nome descritivo (ex: "botmensagem-releases")
   - Marque a permissão: `repo` (Full control of private repositories)
   - Clique em "Generate token"
   - **COPIE O TOKEN** (você só verá ele uma vez!)

2. **Configurar o Token no Sistema**
   - No Linux/macOS:
     ```bash
     export GH_TOKEN="seu_token_aqui"
     ```
   - No Windows (PowerShell):
     ```powershell
     $env:GH_TOKEN="seu_token_aqui"
     ```
   - Ou adicione ao arquivo `.bashrc` / `.zshrc` para permanente (Linux/macOS):
     ```bash
     echo 'export GH_TOKEN="seu_token_aqui"' >> ~/.bashrc
     ```

### Processo de Publicação

1. **Atualizar a Versão no package.json**
   ```bash
   # Edite o package.json e altere a versão
   # Por exemplo, de "1.0.0" para "1.0.1"
   ```

2. **Commitar as Mudanças**
   ```bash
   git add .
   git commit -m "Atualização v1.0.1 - descrição das mudanças"
   git push origin main
   ```

3. **Publicar no GitHub Releases**
   ```bash
   npm run publish
   ```
   
   Este comando irá:
   - Compilar o CSS
   - Criar o executável Windows
   - Criar uma release no GitHub
   - Fazer upload do instalador (.exe) e dos arquivos de atualização

4. **Verificar a Release**
   - Acesse: https://github.com/caslulu/botmensagem/releases
   - Confirme que a nova versão está publicada
   - Verifique se os arquivos foram enviados corretamente

### O Que Acontece no Cliente

Quando você publica uma nova versão:

1. **Verificação Automática**
   - O aplicativo verifica atualizações ao iniciar
   - Também verifica a cada 30 minutos automaticamente

2. **Notificação ao Usuário**
   - Uma janela aparece informando que há uma atualização disponível
   - Mostra as notas da versão
   - Usuário pode escolher baixar ou ignorar

3. **Download**
   - Se o usuário aceitar, o download começa automaticamente
   - Uma barra de progresso mostra o andamento

4. **Instalação**
   - Após o download, o usuário é notificado
   - Pode escolher instalar agora (fecha o app e instala) ou depois
   - A instalação é automática quando o usuário fechar o aplicativo

### Versionamento Semântico

Siga o padrão SemVer (Major.Minor.Patch):

- **Patch** (1.0.X): Correções de bugs, pequenas melhorias
  ```json
  "version": "1.0.1"
  ```

- **Minor** (1.X.0): Novas funcionalidades, compatível com versão anterior
  ```json
  "version": "1.1.0"
  ```

- **Major** (X.0.0): Mudanças grandes, pode quebrar compatibilidade
  ```json
  "version": "2.0.0"
  ```

### Exemplo Completo de Atualização

```bash
# 1. Fazer as mudanças no código
# ... editar arquivos ...

# 2. Atualizar versão no package.json
# Altere "version": "1.0.0" para "1.0.1"

# 3. Commitar
git add .
git commit -m "Fix: correção de bug no envio de mensagens"
git push origin main

# 4. Garantir que o token está configurado
echo $GH_TOKEN  # Deve mostrar seu token

# 5. Publicar
npm run publish

# 6. Verificar
# Acesse: https://github.com/caslulu/botmensagem/releases
```

### Notas de Versão

Ao fazer o commit, escreva uma mensagem clara:
- Isso será usado como descrição da release
- Os clientes verão essa mensagem no dialog de atualização

Exemplo de boas mensagens:
```bash
git commit -m "v1.0.1 - Corrigido bug que impedia envio de imagens grandes"
git commit -m "v1.1.0 - Adicionado suporte para mensagens em vídeo"
git commit -m "v2.0.0 - Nova interface completamente redesenhada"
```

### Troubleshooting

**Erro: "GitHub token is not set"**
- Solução: Configure a variável de ambiente GH_TOKEN conforme descrito acima

**Erro: "Resource not accessible by integration"**
- Solução: Verifique se o token tem a permissão `repo` marcada

**Clientes não recebem atualização**
- Verifique se a versão no package.json é maior que a versão instalada
- Confirme que a release está pública no GitHub
- Espere até 30 minutos (intervalo de verificação automática)

### Primeira Publicação

Para a primeira release (versão 1.0.0 já compilada):

1. Crie uma tag no git:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. Faça upload manual do .exe existente:
   - Acesse: https://github.com/caslulu/botmensagem/releases/new
   - Tag: v1.0.0
   - Title: v1.0.0 - Versão Inicial
   - Descrição: Primeira versão do sistema
   - Anexe o arquivo: `dist/Insurance Helper Setup 1.0.0.exe`
   - Marque como "Latest release"
   - Publique

3. A partir da próxima versão (1.0.1, 1.1.0, etc), use `npm run publish`

## Recursos Adicionais

- Documentação do electron-updater: https://www.electron.build/auto-update
- Documentação do GitHub Releases: https://docs.github.com/en/repositories/releasing-projects-on-github
