def parse_float_val(val):
    """Remove símbolos de moeda, espaços e converte para float de forma robusta."""
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    val = str(val).replace('$', '').replace('R$', '').replace(' ', '').replace('\xa0', '')
    val = val.replace('.', '').replace(',', '.') if val.count(',') == 1 and val.count('.') == 0 else val.replace(',', '')
    import re
    val = re.sub(r'[^0-9.\-]', '', val)
    try:
        return float(val)
    except Exception:
        return 0.0
import requests
from datetime import datetime

def veiculo_vin(vin):
    """Pega o(s) VINs e retorna marca, modelo e ano do veículo."""
    veiculos = ""
    lista_vin = vin.split(" / ")
    for veiculo in lista_vin:
        get_info = requests.get(f'https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/{veiculo}?format=json').json()['Results']
        marca = get_info[7]["Value"]
        modelo = get_info[9]["Value"]
        ano = get_info[10]["Value"]
        if not marca or not modelo or not ano:
            raise ValueError("Não foi possível decodificar o VIN.")
        else:
            carro = f"{marca}, {modelo}, {ano} / "
            veiculos = veiculos + carro
    return veiculos.rstrip(" / ")

def formatar_data(data):
    nascimento = datetime.strptime(data, "%m/%d/%Y").strftime("%m/%d/%Y")
    return nascimento

def separar_nome(nome):
    try:
        partes = nome.split(" ")
        if len(partes) < 2:
            raise ValueError
        first_name = partes[0]
        last_name = partes[-1]
        return (first_name, last_name)
    except Exception as e:
        raise ValueError(f"Voce deve colocar o primeiro e o ultimo nome: {e}")

def separar_documento(documento_completo):
    try:
        documento, estado = documento_completo.split(" - ")
        return (documento, estado)
    except Exception as e:
        raise Exception(f"Verifique se o input esta na formatacao 'documento - estado': {e}")

def separar_endereco(endereco_completo):
    try:
        if len(endereco_completo.split(", ")) == 3:
            rua, cidade, zipcode = endereco_completo.split(", ")
            return (rua, None, cidade, zipcode)
        else:
            rua, apt, cidade, zipcode = endereco_completo.split(", ")
            return (rua, apt, cidade, zipcode)
    except Exception as e:
        raise ValueError(f"Verifique se o input esta na formatacao 'Rua, apt, cidade, zipcode': {e}")

def decodificar_vin(vin):
    try:
        lista_vin = vin.split(" / ")
        return lista_vin
    except Exception as e:
        raise ValueError(f"Verifique se o vin number esta correto: {e}")

def formatar_com_virgula(numero):

    numero_str = f"{float(numero):.2f}"
    parte_inteira, parte_decimal = numero_str.split('.')
    if len(parte_inteira) > 3:
        parte_inteira = f"{parte_inteira[0]},{parte_inteira[1:]}"
    return f"{parte_inteira}.{parte_decimal}"
