# Insurance Helper

Sistema desktop para gerenciar e enviar mensagens automatizadas no WhatsApp Web.

## 🚀 Funcionalidades

- **Multi-perfil**: Gerencie até 2 perfis diferentes (Thiago e Débora)
- **Mensagens Salvas**: Até 5 mensagens por perfil com texto e imagens
- **Envio Automatizado**: Configure quantos grupos cada perfil deve enviar
- **Sessões Separadas**: Cada perfil mantém sua própria sessão do WhatsApp
- **Atualização Automática**: Sistema de updates via GitHub Releases
- **Interface Intuitiva**: Design moderno e fácil de usar

## 📋 Requisitos

- Windows 7 ou superior (64-bit)
- Conexão com internet
- Conta WhatsApp ativa
- **Google Chrome instalado** (recomendado) - o sistema usará seu Chrome ou Chromium automático

## 🔧 Instalação

1. Baixe o instalador mais recente em [Releases](https://github.com/caslulu/botmensagem/releases)
2. Execute `Insurance Helper Setup.exe`
3. Siga as instruções do instalador
4. O aplicativo iniciará automaticamente após a instalação

## 📖 Como Usar

### 1. Selecionar Perfil
- Escolha entre "Thiago" ou "Débora" na tela inicial
- Perfis agora são carregados do banco de dados (tabela `profiles`)
- Cada perfil tem suas próprias mensagens, limite de envio e diretório de sessão persistente

### 2. Configurar Mensagens
- Clique em "Adicionar Nova Mensagem" para criar uma mensagem
- Preencha o texto e/ou selecione uma imagem
- Você pode ter até 5 mensagens salvas por perfil
- Edite ou exclua mensagens existentes conforme necessário

### 3. Configurar Limite de Envio
- Defina quantos grupos o perfil deve enviar (padrão: 10)
- Essa configuração é salva automaticamente

### 4. Selecionar Mensagem
- Marque a checkbox da mensagem que deseja usar para envio
- Apenas uma mensagem pode estar selecionada por vez

### 5. Iniciar Automação
- Clique em "Iniciar Automação"
- Escaneie o QR Code do WhatsApp Web (primeira vez)
- O sistema enviará automaticamente para os grupos configurados

## 🗄️ Perfis e Sessões (Banco de Dados)

Desde a versão 1.0.1 os dados de perfis e sessões foram migrados para o banco SQLite. Estrutura:

Tabela `profiles`:
```
id TEXT PRIMARY KEY
name TEXT
image_path TEXT
default_message TEXT
created_at DATETIME
updated_at DATETIME
```

Tabela `profile_sessions`:
```
profile_id TEXT PRIMARY KEY
session_dir TEXT
last_used_at DATETIME
created_at DATETIME
updated_at DATETIME
```

Benefícios:
- Facilita adicionar novos perfis sem alterar código
- Sessões gerenciadas por perfil (persistência Playwright)
- Possível integrar no futuro com painel de administração

### Local dos diretórios de sessão
Os diretórios de sessão do WhatsApp agora ficam em:
```
<userData>/sessions/<profileId>
```
Onde `<userData>` (produção) é o diretório retornado por `app.getPath('userData')` do Electron.
Em desenvolvimento (fallback) usa `./data/sessions/<profileId>`.

Migração automática: diretórios antigos no formato `./whatsapp_session_<id>` são movidos ou reapontados na primeira inicialização.

Para adicionar manualmente um novo perfil (avançado):
1. Inserir linha em `profiles`
2. Inserir linha correspondente em `profile_sessions`
3. Reiniciar aplicação

## 🔄 Atualizações

O sistema verifica atualizações automaticamente:
- Ao iniciar o aplicativo
- A cada 30 minutos durante o uso

Quando houver uma atualização:
1. Uma notificação aparecerá
2. Você pode baixar imediatamente ou ignorar
3. A instalação ocorre automaticamente ao fechar o app

Para mais detalhes, consulte: [ATUALIZACOES.md](ATUALIZACOES.md)

## 📚 Documentação Técnica

Para desenvolvedores e informações técnicas, consulte a pasta `docs/`:

- [Desenvolvimento](docs/DESENVOLVIMENTO.md) - Como configurar o ambiente de desenvolvimento
- [Build](docs/BUILD.md) - Como gerar o executável
- [Arquitetura](docs/ARQUITETURA.md) - Estrutura do projeto e tecnologias

## 🐛 Problemas Conhecidos

### Chrome não detectado
- O sistema tentará usar o Google Chrome instalado automaticamente
- Se não encontrar, usará o Chromium embutido (funciona da mesma forma)
- Para garantir o uso do Chrome, instale em: `C:\Program Files\Google\Chrome\`

### WhatsApp desconecta
- Solução: Escaneie o QR Code novamente

### Mensagens não enviam
- Verifique se o WhatsApp está aberto
- Confirme se há grupos disponíveis para envio

### Imagem não carrega
- Use imagens em formato JPG ou PNG
- Tamanho máximo recomendado: 5MB

## 📝 Changelog

### v1.0.0 - 2025-11-07
- Versão inicial
- Sistema de múltiplas mensagens por perfil
- Seletor de imagens
- Limite configurável de envio
- Sessões separadas por perfil
- Sistema de auto-atualização

## 📄 Licença

ISC License - veja [LICENSE.txt](LICENSE.txt)

## 👤 Autor

**caslulu**
- GitHub: [@caslulu](https://github.com/caslulu)
- Repositório: [botmensagem](https://github.com/caslulu/botmensagem)

## 🤝 Suporte

Para reportar bugs ou solicitar funcionalidades:
- Abra uma [Issue](https://github.com/caslulu/botmensagem/issues)
- Entre em contato via GitHub

---

**Nota**: Este projeto usa Playwright para automação do WhatsApp Web. Não é afiliado, associado, autorizado ou de qualquer forma oficialmente conectado ao WhatsApp.
