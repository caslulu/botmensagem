# Backend - Auto RTA Generator# Auto Quotes Backend API



API Flask para preenchimento automático de documentos RTA (Registration and Title Application).Backend API para o sistema Auto Quotes - Sistema de cotação de seguros automotivos e geração de documentos RTA.



## Funcionalidades## 🚀 Funcionalidades



- 🔧 API REST em Flask- **API RTA**: Geração de documentos RTA (Registration and Title Application)

- 📄 Preenchimento automático de PDFs- **API Cotação**: Gerenciamento de cotações de seguros

- 🏢 Suporte para templates Allstate e Progressive- **API Preços**: Cotação automática em múltiplas seguradoras

- ✅ Validação de dados robusta- **CORS habilitado** para integração com frontend React

- 🌐 CORS configurado para React

- 📁 Manipulação de PDFs com pypdf## 📋 Requisitos



## Como Executar- Python 3.8+

- pip

```bash- Virtualenv (recomendado)

# Criar ambiente virtual

python -m venv venv## 🛠️ Instalação



# Ativar ambiente virtual (Linux/Mac)1. **Clone e entre na pasta do backend:**

source venv/bin/activate   ```bash

   cd backend

# Ou no Windows   ```

# venv\Scripts\activate

2. **Crie um ambiente virtual:**

# Instalar dependências   ```bash

pip install -r requirements.txt   python -m venv venv

   source venv/bin/activate  # Linux/Mac

# Executar servidor   # ou

python main.py   venv\Scripts\activate     # Windows

```   ```



A API estará disponível em `http://localhost:5000`3. **Instale as dependências:**

   ```bash

## Estrutura   pip install -r requirements.txt

   ```

```

app/4. **Configure as variáveis de ambiente:**

├── assets/                  # Templates PDF   - Copie o arquivo `.env` e ajuste conforme necessário

│   ├── rta_template_allstate.pdf   - Configure as chaves do Trello se necessário

│   └── rta_template_progressive.pdf

├── routes/5. **Execute a aplicação:**

│   └── api_rta_routes.py    # Endpoints da API   ```bash

├── services/   python main.py

│   └── rta_service.py       # Lógica de preenchimento PDF   ```

├── util/

│   └── data_funcoes.py      # UtilitáriosA API estará rodando em `http://localhost:5000`

├── config.py                # Configurações

└── extensions.py            # Extensões Flask## 📖 Endpoints da API

```

### Health Check

## Endpoints- `GET /api/health` - Verifica se a API está funcionando

- `GET /api/info` - Informações da API

### POST `/api/rta`

Gera documento RTA preenchido.### RTA (Registration and Title Application)

- `POST /api/rta` - Gera documento RTA

**Request Body:**- `GET /api/rta/fields` - Lista campos necessários

```json- `POST /api/rta/validate` - Valida dados sem gerar PDF

{

  "insurance_company": "allstate|progressive",### Cotações

  "seller_name": "string",- `GET /api/cotacao` - Lista todas as cotações

  "seller_address": "string",- `POST /api/cotacao` - Cria nova cotação

  "owner_name": "string",- `GET /api/cotacao/{id}` - Busca cotação específica

  "owner_dob": "YYYY-MM-DD",- `PUT /api/cotacao/{id}` - Atualiza cotação

  "owner_license": "string",- `DELETE /api/cotacao/{id}` - Deleta cotação

  "owner_residential_address": "string",

  "vin": "string (17 chars)",### Preços

  "year": number,- `GET /api/preco/seguradoras` - Lista seguradoras disponíveis

  "make": "string",- `POST /api/preco/cotacao` - Cotação em seguradora específica

  "model": "string",- `POST /api/preco/cotacao/multipla` - Cotação em múltiplas seguradoras

  "body_style": "string",- `GET /api/preco/status` - Status dos serviços

  "color": "string",

  "gross_sale_price": number,## 🔧 Exemplo de Uso

  "purchase_date": "YYYY-MM-DD",

  "insurance_effective_date": "YYYY-MM-DD"### Gerar RTA

}```bash

```curl -X POST http://localhost:5000/api/rta \

  -H "Content-Type: application/json" \

**Response:** Download de arquivo PDF  -d '{

    "owner_name": "Alves, Caio",

### GET `/api/health`    "owner_dob": "2000-10-20",

Health check da API.    "owner_license": "123456789",

    "owner_residential_address": "656 Waquoit Hwy, East Falmouth, MA, 02536",

### GET `/api/info`    "vin": "1HGBH41JXMN109186",

Informações sobre a API e endpoints disponíveis.    "body_style": "Sedan",

    "color": "Blue",

## Dependências    "year": 2021,

    "make": "Honda",

- Flask 2.3.2 - Framework web    "model": "Civic"

- Flask-CORS 4.0.0 - CORS para React  }'

- pypdf 3.15.4 - Manipulação de PDFs```

- python-dotenv 1.0.0 - Variáveis de ambiente

### Criar Cotação

## Templates```bash

curl -X POST http://localhost:5000/api/cotacao \

A aplicação suporta dois templates:  -H "Content-Type: application/json" \

- `rta_template_allstate.pdf` - Template da Allstate  -d '{

- `rta_template_progressive.pdf` - Template da Progressive    "nome": "João Silva",

    "telefone": "(11) 99999-9999",

Os templates devem estar na pasta `app/assets/`.    "data_nascimento": "1990-05-15",

    "veiculo_ano": 2020,

## Configuração    "veiculo_marca": "Toyota",

    "veiculo_modelo": "Corolla"

A aplicação roda em modo debug por padrão. Para produção, altere as configurações em `app/config.py`.  }'
```

## 🔐 CORS

A API está configurada para aceitar requisições de:
- `http://localhost:3000` (React dev server padrão)
- `http://127.0.0.1:3000`
- `http://localhost:3001`
- `http://127.0.0.1:3001`

## 📁 Estrutura do Projeto

```
backend/
├── main.py                 # Ponto de entrada da aplicação
├── requirements.txt        # Dependências Python
├── .env                   # Variáveis de ambiente
├── app/
│   ├── __init__.py        # Factory da aplicação Flask
│   ├── config.py          # Configurações
│   ├── extensions.py      # Extensões Flask
│   ├── models/            # Modelos do banco de dados
│   ├── routes/            # Rotas da API
│   ├── services/          # Lógica de negócio
│   ├── util/              # Utilitários
│   └── assets/            # Assets (PDFs, fontes, imagens)
└── instance/              # Banco de dados SQLite
```

## 🐛 Debug

Para habilitar logs de debug, configure:
```bash
export FLASK_DEBUG=True
```

## 📦 Deploy

Para produção, use um servidor WSGI como Gunicorn:
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 main:app
```