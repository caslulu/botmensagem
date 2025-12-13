# Sistema de Múltiplas Mensagens

## Visão Geral

Cada perfil agora pode ter até **5 mensagens salvas**, permitindo maior flexibilidade no envio de mensagens pelo WhatsApp.

## Funcionalidades

### ✅ Adicionar Mensagem
- Clique no botão **"+ Adicionar mensagem"** no painel de controle
- Digite o texto da mensagem
- **Selecione uma imagem**:
  - Clique no botão **"📁 Selecionar"** para escolher uma imagem do seu computador
  - OU cole o caminho completo manualmente
  - OU deixe vazio para usar a imagem padrão do perfil
- Salve a mensagem

**Formatos de imagem suportados**: JPG, JPEG, PNG, GIF, BMP, WEBP

**Limite**: Máximo de 5 mensagens por perfil

### ✏️ Editar Mensagem
- Clique no ícone de lápis (✎) na mensagem que deseja editar
- Modifique o texto
- **Modifique a imagem** (opcional):
  - Clique em **"📁 Selecionar"** para escolher uma nova imagem
  - OU edite o caminho manualmente
  - OU limpe o campo para usar a imagem padrão
- Salve as alterações

### 🗑️ Deletar Mensagem
- Clique no ícone da lixeira (🗑) na mensagem que deseja remover
- Confirme a exclusão

**Nota**: Se você deletar a mensagem atualmente selecionada, a primeira mensagem disponível será automaticamente selecionada.

### ✓ Selecionar Mensagem
- Clique no ícone de check (✓) para selecionar qual mensagem será enviada
- A mensagem selecionada será marcada com um badge "Ativa"
- Apenas uma mensagem pode estar ativa por vez

## Armazenamento

Todas as mensagens são salvas em um **banco de dados SQLite** localizado em:
```
/data/messages.db
```

Isso significa que suas mensagens persistem mesmo após fechar a aplicação.

## Estrutura do Banco de Dados

### Tabela: `messages`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INTEGER | ID único da mensagem |
| `profile_id` | TEXT | ID do perfil (thiago/debora) |
| `text` | TEXT | Texto da mensagem |
| `image_path` | TEXT | Caminho para a imagem (opcional) |
| `is_selected` | INTEGER | 1 se ativa, 0 se não |
| `created_at` | DATETIME | Data de criação |
| `updated_at` | DATETIME | Data da última atualização |

## Migração Inicial

Na primeira execução, as mensagens padrão dos perfis são automaticamente importadas para o banco de dados.

## Interface do Usuário

### Painel de Mensagens
- **Lista de mensagens**: Mostra todas as mensagens salvas com prévia do texto
- **Badge "Ativa"**: Indica qual mensagem está selecionada
- **Botões de ação**: Selecionar, Editar e Deletar para cada mensagem
- **Pré-visualização**: Mostra o texto completo da mensagem selecionada

### Modal de Edição
- Campo de texto para a mensagem (suporta múltiplas linhas)
- Campo para imagem com **botão "📁 Selecionar"** para escolher arquivos do computador
- Botões Cancelar e Salvar

## Tecnologias Utilizadas

- **sql.js**: Biblioteca SQLite pura em JavaScript (compatível com Electron)
- **IPC (Inter-Process Communication)**: Comunicação entre processo principal e renderer
- **Context Bridge**: Exposição segura de APIs para o renderer

## Logs

A aplicação registra todas as operações no painel de logs:
- ✓ Mensagem adicionada com sucesso
- ✓ Mensagem atualizada com sucesso
- ✓ Mensagem deletada com sucesso
- ✓ Mensagem selecionada com sucesso
- ⚠️ Erros e avisos quando aplicável

## Limitações

1. **Máximo 5 mensagens por perfil**: Limite implementado para manter a organização
2. **Sempre uma mensagem ativa**: Sempre haverá pelo menos uma mensagem selecionada se existir alguma mensagem
3. **Imagens**: O caminho da imagem deve ser válido e acessível no sistema de arquivos

## Desenvolvimento

### Arquivos Modificados

1. **src/main/database.js**: Gerenciamento do banco de dados SQLite
2. **src/main/profiles.js**: Integração com o banco de dados
3. **src/main/main.js**: Handlers IPC para operações de mensagens
4. **src/preload/preload.js**: Exposição de APIs no contexto do renderer
5. **src/renderer/index.html**: Interface do usuário com lista e modal
6. **src/renderer/renderer.js**: Lógica de gerenciamento de mensagens
7. **src/renderer/styles/tailwind.css**: Estilos para componentes

### Dependências Adicionadas

```json
{
  "sql.js": "^1.x.x"
}
```
