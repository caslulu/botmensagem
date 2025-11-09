"""
Formatadores de dados para o Trello
"""

import json

def formatar_veiculos(veiculos):
    """
    Formata lista de veículos para descrição do Trello
    
    Args:
        veiculos (list or str): Lista de veículos ou string JSON
        
    Returns:
        str: Descrição formatada dos veículos
    """
    veiculos_lista = []
    
    # Converter string JSON para lista se necessário
    if isinstance(veiculos, str):
        try:
            veiculos_lista = json.loads(veiculos)
        except (json.JSONDecodeError, TypeError):
            return str(veiculos) if veiculos else ''
    elif isinstance(veiculos, list):
        veiculos_lista = veiculos
    else:
        return ''
    
    if not veiculos_lista:
        return ''
    
    descricao = "\n" + "="*50 + "\nVEÍCULOS:\n" + "="*50 + "\n"
    
    for idx, veiculo in enumerate(veiculos_lista, 1):
        vin = veiculo.get('vin', '-')
        financiado = veiculo.get('financiado', '-')
        tempo = veiculo.get('tempo_com_veiculo', '-')
        placa = veiculo.get('placa', '-')
        
        # Tentar obter informações do veículo pelo VIN
        marca_modelo_ano = '-'
        if vin and vin != '-':
            try:
                # Importar função de lookup do VIN se disponível
                from data_funcoes import veiculo_vin
                marca_modelo_ano = veiculo_vin(vin)
            except ImportError:
                # Se não tiver a função, usar dados do próprio veículo
                ano = veiculo.get('ano', '')
                marca = veiculo.get('marca', '')
                modelo = veiculo.get('modelo', '')
                if ano or marca or modelo:
                    marca_modelo_ano = f"{ano} {marca} {modelo}".strip()
            except Exception:
                marca_modelo_ano = '-'
        
        descricao += (
            f"\n🚗 Veículo {idx}:\n"
            f"   VIN: {vin}\n"
            f"   Placa: {placa}\n"
            f"   Veículo: {marca_modelo_ano}\n"
            f"   Estado: {financiado}\n"
            f"   Tempo com veículo: {tempo}\n"
        )
    
    return descricao

def formatar_pessoas(pessoas):
    """
    Formata lista de pessoas (drivers extras) para descrição do Trello
    
    Args:
        pessoas (list or str): Lista de pessoas ou string JSON
        
    Returns:
        str: Descrição formatada das pessoas
    """
    pessoas_lista = []
    
    # Converter string JSON para lista se necessário
    if isinstance(pessoas, str):
        try:
            pessoas_lista = json.loads(pessoas)
        except (json.JSONDecodeError, TypeError):
            return ''
    elif isinstance(pessoas, list):
        pessoas_lista = pessoas
    else:
        return ''
    
    if not pessoas_lista:
        return ''
    
    descricao = "\n" + "="*50 + "\nDRIVERS ADICIONAIS:\n" + "="*50 + "\n"
    
    for idx, pessoa in enumerate(pessoas_lista, 1):
        nome = pessoa.get('nome', '-')
        documento = pessoa.get('documento', '-')
        data_nascimento = pessoa.get('data_nascimento', '-')
        parentesco = pessoa.get('parentesco', '-')
        genero = pessoa.get('genero', '-')
        
        descricao += (
            f"\n👤 Driver {idx}:\n"
            f"   Nome: {nome}\n"
            f"   Documento: {documento}\n"
            f"   Data de Nascimento: {data_nascimento}\n"
            f"   Parentesco: {parentesco}\n"
            f"   Gênero: {genero}\n"
        )
    
    return descricao

def formatar_endereco(endereco):
    """
    Formata endereço de forma padronizada
    
    Args:
        endereco (str): Endereço completo
        
    Returns:
        str: Endereço formatado
    """
    if not endereco:
        return '-'
    
    # Separa por vírgula e formata
    partes = [p.strip() for p in endereco.split(',')]
    return ', '.join(partes)

def formatar_telefone(telefone):
    """
    Formata número de telefone
    
    Args:
        telefone (str): Número de telefone
        
    Returns:
        str: Telefone formatado
    """
    if not telefone:
        return '-'
    
    # Remove caracteres não numéricos
    numeros = ''.join(filter(str.isdigit, telefone))
    
    # Formata baseado no tamanho
    if len(numeros) == 11:
        return f"({numeros[:2]}) {numeros[2:7]}-{numeros[7:]}"
    elif len(numeros) == 10:
        return f"({numeros[:2]}) {numeros[2:6]}-{numeros[6:]}"
    else:
        return telefone