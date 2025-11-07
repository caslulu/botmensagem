# Central de Disparos WhatsApp

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

## 🔧 Instalação

1. Baixe o instalador mais recente em [Releases](https://github.com/caslulu/botmensagem/releases)
2. Execute `Central de Disparos WhatsApp Setup.exe`
3. Siga as instruções do instalador
4. O aplicativo iniciará automaticamente após a instalação

## 📖 Como Usar

### 1. Selecionar Perfil
- Escolha entre "Thiago" ou "Débora" na tela inicial
- Cada perfil tem suas próprias mensagens e sessão do WhatsApp

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
