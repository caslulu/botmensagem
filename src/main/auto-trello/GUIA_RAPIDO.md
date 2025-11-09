# 🎯 Módulo Trello - Guia Completo

## ✅ Módulo criado com sucesso!

### 📁 Estrutura do Módulo

```
trello_module/
├── README.md              # Documentação completa
├── requirements.txt       # Dependências (requests, python-dotenv)
├── .env                   # Suas credenciais (já configurado!)
├── .env.example          # Exemplo de configuração
├── .gitignore            # Arquivos ignorados no Git
├── trello_client.py      # Cliente principal
├── test_module.py        # Script de teste
├── utils/
│   ├── __init__.py
│   └── formatters.py     # Formatadores de dados
└── examples/
    ├── exemplo_basico.py    # Exemplo simples
    └── exemplo_completo.py  # Exemplo avançado

```

## 🚀 Como usar

### 1. Instalar dependências

```bash
cd trello_module
pip install -r requirements.txt
```

### 2. Testar o módulo

```bash
python test_module.py
```

### 3. Executar exemplos

```bash
# Exemplo básico
python examples/exemplo_basico.py

# Exemplo completo com veículos e anexos
python examples/exemplo_completo.py
```

## 📖 Uso no seu código

### Importar o cliente

```python
from trello_client import TrelloClient

# Inicializar
trello = TrelloClient()
```

### Criar card simples

```python
card_id = trello.criar_carta(
    nome="João Silva",
    documento="123.456.789-00",
    endereco="Rua Exemplo, 123",
    data_nascimento="1990-05-15"
)
```

### Criar card com veículos

```python
veiculos = [
    {
        'vin': '1HGBH41JXMN109186',
        'placa': 'ABC1234',
        'financiado': 'Quitado',
        'tempo_com_veiculo': '2 anos'
    }
]

card_id = trello.criar_carta(
    nome="João Silva",
    documento="123.456.789-00",
    endereco="Rua Exemplo, 123",
    data_nascimento="1990-05-15",
    veiculos=veiculos
)
```

### Anexar arquivo

```python
resultado = trello.anexar_arquivo(card_id, "/caminho/arquivo.pdf")

if resultado['success']:
    print("Arquivo anexado!")
```

### Anexar múltiplos arquivos

```python
arquivos = [
    "documento1.pdf",
    "foto.jpg",
    "cnh.pdf"
]

resultado = trello.anexar_multiplos_arquivos(card_id, arquivos)
print(f"Sucesso: {len(resultado['sucesso'])}")
print(f"Falhas: {len(resultado['falha'])}")
```

## 🔧 API Reference

### Métodos principais:

- `criar_carta(**kwargs)` - Cria um card no Trello
- `anexar_arquivo(card_id, file_path)` - Anexa um arquivo
- `anexar_multiplos_arquivos(card_id, file_paths)` - Anexa múltiplos arquivos
- `gerar_email(nome_completo)` - Gera email automaticamente
- `buscar_card(card_id)` - Busca informações de um card
- `atualizar_descricao(card_id, nova_descricao)` - Atualiza descrição

### Parâmetros do criar_carta():

- `nome` (str) - **Obrigatório**
- `documento` (str) - CPF/RG/Driver License
- `endereco` (str) - Endereço completo
- `data_nascimento` (str) - Data de nascimento
- `email` (str) - Email (auto-gerado se não fornecido)
- `tempo_de_seguro` (str) - Tempo de seguro
- `tempo_no_endereco` (str) - Tempo no endereço
- `veiculos` (list) - Lista de veículos
- `pessoas` (list) - Lista de drivers extras
- `nome_conjuge` (str) - Nome do cônjuge
- `data_nascimento_conjuge` (str) - Data nascimento cônjuge
- `documento_conjuge` (str) - Documento do cônjuge

## 🔐 Configuração

Suas credenciais já estão configuradas no arquivo `.env`:

```
TRELLO_KEY=69a76b234ae60c6bef73e62ac0a05004
TRELLO_TOKEN=ATTA686e454755230769debf1f8347397711324c4b14962a82ad783ea758634d4b6fB43B7625
TRELLO_ID_LIST=662d7f3ed2bd7931022f2ed6
URL_TRELLO=https://api.trello.com/1/cards
```

## 💡 Dicas

1. **Email automático**: Se não fornecer email, será gerado automaticamente
2. **Múltiplos anexos**: Use `anexar_multiplos_arquivos()` para eficiência
3. **Formatação**: Os formatadores em `utils/formatters.py` garantem boa apresentação
4. **Erro handling**: Todos os métodos retornam valores claros de sucesso/erro

## 🔄 Integração com outros projetos

### Com Flask:

```python
from flask import Flask, request
from trello_client import TrelloClient

app = Flask(__name__)
trello = TrelloClient()

@app.route('/api/criar-card', methods=['POST'])
def criar_card():
    dados = request.json
    card_id = trello.criar_carta(**dados)
    return {'card_id': card_id}
```

### Com FastAPI:

```python
from fastapi import FastAPI, UploadFile
from trello_client import TrelloClient

app = FastAPI()
trello = TrelloClient()

@app.post("/criar-card")
async def criar_card(dados: dict):
    card_id = trello.criar_carta(**dados)
    return {"card_id": card_id}
```

## 📚 Próximos passos

1. Execute `python test_module.py` para verificar
2. Experimente os exemplos em `examples/`
3. Integre no seu projeto principal
4. Personalize os formatadores conforme necessário

## 🆘 Problemas comuns

**Erro: "Credenciais não encontradas"**
- Verifique se o arquivo `.env` existe
- Confirme que as variáveis estão corretas

**Erro ao anexar arquivo**
- Verifique se o arquivo existe no caminho especificado
- Confirme permissões de leitura do arquivo

**Card não aparece no Trello**
- Verifique se o `TRELLO_ID_LIST` está correto
- Confirme que tem acesso à lista no Trello

---

✨ **Módulo pronto para uso!** ✨