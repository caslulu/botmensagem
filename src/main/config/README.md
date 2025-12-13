# Configuração do Trello

## Problema Resolvido

Anteriormente, quando o cliente tentava abrir o arquivo `.exe`, ocorria um erro relacionado ao Trello porque as variáveis de ambiente do arquivo `.env` não estavam sendo carregadas corretamente no executável compilado.

## Solução Implementada

As credenciais do Trello agora estão armazenadas em dois lugares:

1. **Durante desenvolvimento**: Continue usando o arquivo `.env` na raiz do projeto
2. **No executável (produção)**: As credenciais estão compiladas diretamente no arquivo `src/main/config/trello-config.js`

### ⚙️ Configuração Inicial (OBRIGATÓRIO)

**Antes de fazer o build do executável**, você DEVE criar o arquivo de configuração:

1. Copie o arquivo de exemplo:
   ```powershell
   Copy-Item src\main\config\trello-config.example.js src\main\config\trello-config.js
   ```

2. Edite o arquivo `src/main/config/trello-config.js` e substitua os valores de exemplo pelas suas credenciais reais do Trello

3. As credenciais estão no arquivo `.env` na raiz do projeto - copie de lá

### Ordem de Prioridade

O sistema agora busca as credenciais na seguinte ordem:

1. **`process.env`** - Variáveis de ambiente do sistema
2. **`trello-config.js`** - Configuração compilada no executável ✨ **NOVO**
3. **Arquivos `.env`** - Busca em vários diretórios possíveis

### Arquivos Modificados

- **`src/main/config/trello-config.js`** (novo) - Contém as credenciais hardcoded ⚠️ **NÃO COMMITADO**
- **`src/main/config/trello-config.example.js`** (novo) - Arquivo de exemplo para referência
- **`src/main/trello/services/trelloService.js`** - Atualizado para usar o arquivo de configuração
- **`.gitignore`** - Atualizado para ignorar `trello-config.js`

### Como Atualizar as Credenciais

Se precisar alterar as credenciais do Trello no futuro:

1. Edite o arquivo `src/main/config/trello-config.js`
2. Atualize também o arquivo `.env` na raiz (para desenvolvimento)
3. Rebuilde o executável: `npm run build`

### Variáveis Disponíveis

- `TRELLO_KEY` - Chave da API do Trello
- `TRELLO_TOKEN` - Token de autenticação do Trello
- `TRELLO_ID_LIST` - ID da lista onde os cards serão criados
- `URL_TRELLO` - URL base da API do Trello

## Teste

Para verificar se está funcionando corretamente:

1. Configure o arquivo conforme instruções acima
2. Build o executável: `npm run build`
3. Execute o arquivo `.exe` gerado em `dist/`
4. Tente criar um card no Trello - deve funcionar sem erros

## Segurança

⚠️ **IMPORTANTE**: 
- O arquivo `trello-config.js` contém credenciais sensíveis e está no `.gitignore`
- **NUNCA** commite este arquivo no repositório
- Cada desenvolvedor/máquina deve criar seu próprio `trello-config.js` a partir do arquivo `.example`
- Para distribuir o executável, o `trello-config.js` DEVE existir antes do build
