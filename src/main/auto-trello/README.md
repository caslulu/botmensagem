# Trello Module

Módulo independente para integração com Trello - criação de cards e anexação de arquivos.

## 🚀 Funcionalidades

- ✅ Criação de cards no Trello
- ✅ Anexação de múltiplas imagens/documentos
- ✅ Geração automática de email
- ✅ Suporte a informações de veículos e pessoas
- ✅ Formatação automática de descrição

## 📋 Requisitos

```bash
pip install -r requirements.txt
```

## 🛠️ Instalação

1. **Configure as variáveis de ambiente:**

Crie um arquivo `.env` na raiz do módulo:

```env
TRELLO_KEY=sua_chave_aqui
TRELLO_TOKEN=seu_token_aqui
TRELLO_ID_LIST=id_da_lista_aqui
URL_TRELLO=https://api.trello.com/1/cards
```

2. **Instale as dependências:**

```bash
pip install -r requirements.txt
```

## 📖 Como usar

### Exemplo básico:

```python
from trello_client import TrelloClient

# Inicializar cliente
trello = TrelloClient()

# Criar card simples
card_id = trello.criar_carta(
    nome="João Silva",
    documento="123.456.789-00",
    endereco="Rua Exemplo, 123, São Paulo, SP",
    data_nascimento="1990-05-15",
    email="joaosilva@outlook.com"
)

# Anexar arquivo
response = trello.anexar_arquivo(card_id, "/caminho/para/arquivo.pdf")
```

### Exemplo com veículos e pessoas:

```python
veiculos = [
    {
        'vin': '1HGBH41JXMN109186',
        'financiado': 'Quitado',
        'tempo_com_veiculo': '2 anos'
    }
]

pessoas = [
    {
        'nome': 'Maria Silva',
        'documento': '987.654.321-00',
        'data_nascimento': '1992-03-20',
        'parentesco': 'Cônjuge',
        'genero': 'Feminino'
    }
]

card_id = trello.criar_carta(
    nome="João Silva",
    documento="123.456.789-00",
    endereco="Rua Exemplo, 123",
    data_nascimento="1990-05-15",
    veiculos=veiculos,
    pessoas=pessoas
)
```

## 🔧 API Reference

### TrelloClient

#### `criar_carta(**kwargs)`
Cria um card no Trello.

**Parâmetros:**
- `nome` (str): Nome do cliente
- `documento` (str): CPF/RG
- `endereco` (str): Endereço completo
- `data_nascimento` (str): Data de nascimento
- `email` (str, opcional): Email (gerado automaticamente se não fornecido)
- `veiculos` (list, opcional): Lista de dicionários com dados dos veículos
- `pessoas` (list, opcional): Lista de dicionários com dados de pessoas extras
- `tempo_de_seguro` (str, opcional): Tempo de seguro
- `tempo_no_endereco` (str, opcional): Tempo no endereço atual

**Retorna:** `str` - ID do card criado ou `None` em caso de erro

#### `anexar_arquivo(card_id, file_path)`
Anexa um arquivo ao card.

**Parâmetros:**
- `card_id` (str): ID do card
- `file_path` (str): Caminho completo do arquivo

**Retorna:** `dict` - Resposta da API do Trello

#### `gerar_email(nome_completo)`
Gera email automaticamente a partir do nome.

**Parâmetros:**
- `nome_completo` (str): Nome completo

**Retorna:** `str` - Email gerado

## 📁 Estrutura

```
trello_module/
├── README.md
├── requirements.txt
├── .env.example
├── trello_client.py      # Cliente principal
├── utils/
│   ├── __init__.py
│   └── formatters.py     # Formatadores de dados
└── examples/
    ├── exemplo_basico.py
    └── exemplo_completo.py
```

## 🔐 Obtendo credenciais do Trello

1. Acesse: https://trello.com/app-key
2. Copie sua **API Key**
3. Clique em gerar **Token**
4. Copie o **Token**
5. Para obter o **ID da lista**, abra o Trello e adicione `.json` na URL da board

## 📝 Licença

MIT