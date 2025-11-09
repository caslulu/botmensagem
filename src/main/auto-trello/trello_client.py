"""
Trello Client - Cliente para integração com Trello
Cria cards e anexa arquivos de forma simplificada
"""

import requests
import os
import json
from dotenv import load_dotenv
from utils.formatters import formatar_veiculos, formatar_pessoas

class TrelloClient:
    """
    Cliente para integração com a API do Trello
    """
    
    def __init__(self, env_path=None):
        """
        Inicializa o cliente Trello
        
        Args:
            env_path (str, optional): Caminho para o arquivo .env
        """
        if env_path:
            load_dotenv(env_path)
        else:
            load_dotenv()
            
        self.URL_TRELLO = os.getenv("URL_TRELLO", "https://api.trello.com/1/cards")
        self.api_key = os.getenv("TRELLO_KEY")
        self.api_token = os.getenv("TRELLO_TOKEN")
        self.list_id = os.getenv("TRELLO_ID_LIST")
        
        # Validar credenciais
        if not all([self.api_key, self.api_token, self.list_id]):
            raise ValueError(
                "Credenciais do Trello não encontradas. "
                "Configure TRELLO_KEY, TRELLO_TOKEN e TRELLO_ID_LIST no arquivo .env"
            )
    
    def criar_carta(self, **kwargs):
        """
        Cria uma carta no Trello
        
        Args:
            nome (str): Nome do cliente
            documento (str): CPF/RG/Driver License
            endereco (str): Endereço completo
            data_nascimento (str): Data de nascimento
            email (str, optional): Email (gerado automaticamente se não fornecido)
            tempo_de_seguro (str, optional): Tempo de seguro
            tempo_no_endereco (str, optional): Tempo no endereço
            veiculos (list, optional): Lista de veículos
            pessoas (list, optional): Lista de pessoas extras (drivers)
            nome_conjuge (str, optional): Nome do cônjuge
            data_nascimento_conjuge (str, optional): Data de nascimento do cônjuge
            documento_conjuge (str, optional): Documento do cônjuge
            
        Returns:
            str: ID do card criado ou None em caso de erro
        """
        # Gerar email se não fornecido
        email = kwargs.get('email')
        if not email:
            email = self.gerar_email(kwargs.get('nome', ''))
        
        # Processar veículos
        veiculos = kwargs.get('veiculos', [])
        veiculos_desc = formatar_veiculos(veiculos)
        
        # Processar pessoas extras
        pessoas = kwargs.get('pessoas', [])
        pessoas_desc = formatar_pessoas(pessoas)
        
        # Montar descrição principal
        descricao = (
            f"Documento: {kwargs.get('documento', '-')}\n"
            f"Endereço: {kwargs.get('endereco', '-')}\n"
            f"Data de Nascimento: {kwargs.get('data_nascimento', '-')}\n"
            f"Tempo de Seguro: {kwargs.get('tempo_de_seguro', '-')}\n"
            f"Tempo no Endereço: {kwargs.get('tempo_no_endereco', '-')}\n"
            f"Email: {email}\n"
            f"\n{veiculos_desc}"
            f"\n{pessoas_desc}"
        )
        
        # Adicionar informações do cônjuge se fornecidas
        nome_conjuge = kwargs.get('nome_conjuge')
        if nome_conjuge:
            desc_conjuge = (
                f"\n{'='*50}\n"
                f"INFORMAÇÕES DO CÔNJUGE:\n"
                f"Nome: {nome_conjuge}\n"
                f"Data de Nascimento: {kwargs.get('data_nascimento_conjuge', '-')}\n"
                f"Documento: {kwargs.get('documento_conjuge', '-')}\n"
            )
            descricao += desc_conjuge
        
        # Parâmetros para criar o card
        params = {
            "key": self.api_key,
            "token": self.api_token,
            "idList": self.list_id,
            "name": kwargs.get('nome', 'Sem Nome'),
            "desc": descricao
        }
        
        try:
            response = requests.post(self.URL_TRELLO, params=params)
            response.raise_for_status()
            return response.json().get("id")
        except requests.exceptions.RequestException as e:
            print(f"Erro ao criar card no Trello: {e}")
            return None
    
    def anexar_arquivo(self, card_id, file_path):
        """
        Anexa um arquivo a um card do Trello
        
        Args:
            card_id (str): ID do card
            file_path (str): Caminho completo do arquivo
            
        Returns:
            dict: Resposta da API do Trello
            
        Raises:
            FileNotFoundError: Se o arquivo não existir
            ValueError: Se o card_id não for fornecido
        """
        if not card_id:
            raise ValueError("card_id é obrigatório")
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Arquivo não encontrado: {file_path}")
        
        url = f"https://api.trello.com/1/cards/{card_id}/attachments"
        params = {
            'key': self.api_key,
            'token': self.api_token
        }
        
        try:
            with open(file_path, 'rb') as file:
                files = {'file': file}
                response = requests.post(url, params=params, files=files)
                response.raise_for_status()
                return {
                    'success': True,
                    'status_code': response.status_code,
                    'data': response.json()
                }
        except requests.exceptions.RequestException as e:
            print(f"Erro ao anexar arquivo: {e}")
            return {
                'success': False,
                'status_code': getattr(response, 'status_code', None),
                'error': str(e)
            }
    
    def anexar_multiplos_arquivos(self, card_id, file_paths):
        """
        Anexa múltiplos arquivos a um card
        
        Args:
            card_id (str): ID do card
            file_paths (list): Lista de caminhos de arquivos
            
        Returns:
            dict: Resumo das anexações
        """
        resultados = {
            'sucesso': [],
            'falha': [],
            'total': len(file_paths)
        }
        
        for file_path in file_paths:
            if not os.path.exists(file_path):
                resultados['falha'].append({
                    'arquivo': file_path,
                    'erro': 'Arquivo não encontrado'
                })
                continue
            
            resultado = self.anexar_arquivo(card_id, file_path)
            
            if resultado.get('success'):
                resultados['sucesso'].append({
                    'arquivo': os.path.basename(file_path),
                    'status': 'OK'
                })
            else:
                resultados['falha'].append({
                    'arquivo': os.path.basename(file_path),
                    'erro': resultado.get('error', 'Erro desconhecido')
                })
        
        return resultados
    
    def gerar_email(self, nome_completo):
        """
        Gera um email automaticamente a partir do nome completo
        
        Args:
            nome_completo (str): Nome completo da pessoa
            
        Returns:
            str: Email gerado no formato nome@outlook.com
        """
        if not nome_completo:
            return ''
        
        # Remove espaços, caracteres especiais e converte para minúsculas
        email_user = nome_completo.lower()
        email_user = email_user.replace(' ', '')
        email_user = email_user.replace('.', '')
        email_user = email_user.replace(',', '')
        
        return f"{email_user}@outlook.com"
    
    def buscar_card(self, card_id):
        """
        Busca informações de um card
        
        Args:
            card_id (str): ID do card
            
        Returns:
            dict: Dados do card ou None se não encontrado
        """
        url = f"https://api.trello.com/1/cards/{card_id}"
        params = {
            'key': self.api_key,
            'token': self.api_token
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Erro ao buscar card: {e}")
            return None
    
    def atualizar_descricao(self, card_id, nova_descricao):
        """
        Atualiza a descrição de um card
        
        Args:
            card_id (str): ID do card
            nova_descricao (str): Nova descrição
            
        Returns:
            bool: True se atualizado com sucesso
        """
        url = f"https://api.trello.com/1/cards/{card_id}"
        params = {
            'key': self.api_key,
            'token': self.api_token,
            'desc': nova_descricao
        }
        
        try:
            response = requests.put(url, params=params)
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            print(f"Erro ao atualizar descrição: {e}")
            return False