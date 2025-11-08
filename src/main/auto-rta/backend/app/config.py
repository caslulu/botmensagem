import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "auto_quotes_api_secret_key_2024")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URI", "sqlite:///instance/cotacao.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Configurações específicas da API
    API_VERSION = "1.0.0"
    # Tamanho máximo upload (MB) configurável por env UPLOAD_MAX_MB (default 16)
    _max_mb = int(os.getenv("UPLOAD_MAX_MB", "16"))
    MAX_CONTENT_LENGTH = _max_mb * 1024 * 1024
    
    # Configurações de upload/download
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets')
    
    # Configurações do Trello (se necessário)
    TRELLO_API_KEY = os.getenv("TRELLO_API_KEY")
    TRELLO_API_TOKEN = os.getenv("TRELLO_API_TOKEN")
    
    # Configurações de desenvolvimento
    DEBUG = os.getenv("FLASK_DEBUG", "True").lower() in ['true', '1', 'yes']