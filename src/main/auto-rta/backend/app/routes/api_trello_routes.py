from flask import Blueprint, request, jsonify
import os
import requests
import re
import json
from werkzeug.utils import secure_filename

# Helpers locais para formatar descrição com base no payload enviado
def _formatar_veiculos(veiculos):
    if not veiculos:
        return ''
    linhas = ["Veículos:"]
    for idx, v in enumerate(veiculos, 1):
        vin = v.get('vin') or '-'
        placa = v.get('placa') or '-'
        financiado = v.get('financiado') or '-'
        tempo = v.get('tempo_com_veiculo') or '-'
        ano = v.get('ano') or ''
        marca = v.get('marca') or ''
        modelo = v.get('modelo') or ''
        mm = f"{ano} {marca} {modelo}".strip() or '-'
        linhas.append(
            f"🚗 Veículo {idx}:\n"
            f"  VIN: {vin}\n"
            f"  Placa: {placa}\n"
            f"  Veículo: {mm}\n"
            f"  Estado: {financiado}\n"
            f"  Tempo com veículo: {tempo}"
        )
    return "\n".join(linhas)

def _format_us_date(date_str: str) -> str:
    """Converte datas para formato MM/DD/YYYY quando possível."""
    if not date_str:
        return ''
    s = str(date_str).strip()
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", s)
    if m:
        y, mm, dd = m.groups()
        return f"{mm}/{dd}/{y}"
    m = re.match(r"^(\d{2})\/(\d{2})\/(\d{4})$", s)
    if m:
        dd, mm, y = m.groups()
        return f"{mm}/{dd}/{y}"
    return s

def _formatar_pessoas(pessoas):
    if not pessoas:
        return ''
    linhas = ["\nDrivers Adicionais:"]
    for idx, p in enumerate(pessoas, 1):
        nome = p.get('nome') or '-'
        doc = p.get('documento') or '-'
        dn_raw = p.get('data_nascimento') or ''
        dn = _format_us_date(dn_raw) if dn_raw else '-'
        par = p.get('parentesco') or '-'
        gen = p.get('genero') or '-'
        linhas.append(
            f"\n👤 Driver {idx}:\n"
            f"  Nome: {nome}\n"
            f"  Documento: {doc}\n"
            f"  Data de Nascimento: {dn}\n"
            f"  Parentesco: {par}\n"
            f"  Gênero: {gen}"
        )
    return "\n".join(linhas)

api_trello_bp = Blueprint('api_trello', __name__, url_prefix='/api')

def _sanitize(text: str) -> str:
    """Evita vazar credenciais em mensagens de erro."""
    if text is None:
        return text
    out = str(text)
    key = os.getenv('TRELLO_KEY')
    tok = os.getenv('TRELLO_TOKEN')
    if key:
        out = out.replace(key, '***')
    if tok:
        out = out.replace(tok, '***')
    out = out.replace('key=', 'key=***').replace('token=', 'token=***')
    return out

@api_trello_bp.route('/trello/auth-check', methods=['GET'])
def trello_auth_check():
    key = os.getenv('TRELLO_KEY')
    token = os.getenv('TRELLO_TOKEN')
    list_id = os.getenv('TRELLO_ID_LIST')
    base = 'https://api.trello.com/1'

    if not key or not token:
        return jsonify({'ok': False, 'error': 'Credenciais ausentes (TRELLO_KEY/TRELLO_TOKEN)'}), 400

    try:
        me = requests.get(f'{base}/members/me', params={'key': key, 'token': token}, timeout=15)
        status = {'me_ok': me.ok, 'me_status': me.status_code}
        if me.ok:
            status['member'] = me.json().get('username')

        if list_id:
            lst = requests.get(f'{base}/lists/{list_id}', params={'key': key, 'token': token}, timeout=15)
            status['list_ok'] = lst.ok
            status['list_status'] = lst.status_code
            if lst.ok:
                status['list_name'] = lst.json().get('name')
        else:
            status['list_ok'] = None
            status['list_status'] = None

        http_code = 200 if status.get('me_ok') and (status.get('list_ok') in (True, None)) else 401
        status['ok'] = http_code == 200
        return jsonify(status), http_code
    except requests.exceptions.RequestException as e:
        return jsonify({'ok': False, 'error': _sanitize(str(e))}), 502

@api_trello_bp.route('/trello', methods=['POST'])
def create_trello_card():
    """Cria um card no Trello. Suporta:

    - application/json: body é o payload JSON; sem imagens
    - multipart/form-data: campo 'payload' (JSON) + 'images' (múltiplos arquivos)
    """
    try:
        files = []
        data = {}
        ct = request.content_type or ''
        if 'multipart/form-data' in ct:
            # FormData com JSON + arquivos
            raw = request.form.get('payload') or request.form.get('data')
            if raw:
                try:
                    data = json.loads(raw)
                except Exception:
                    return jsonify({'error': 'payload inválido (JSON malformado)'}), 400
            else:
                return jsonify({'error': "Campo 'payload' ausente no form-data"}), 400
            files = request.files.getlist('images') or []
        else:
            # JSON puro
            data = request.get_json(silent=True) or {}

        key = os.getenv('TRELLO_KEY')
        token = os.getenv('TRELLO_TOKEN')
        list_id = os.getenv('TRELLO_ID_LIST')
        url = os.getenv('TRELLO_URL', 'https://api.trello.com/1/cards')

        if not all([key, token, list_id]):
            return jsonify({'error': 'Trello credentials not configured (TRELLO_KEY/TRELLO_TOKEN/TRELLO_ID_LIST)'}), 500

        name = data.get('nome') or data.get('name') or 'Sem Nome'

        # Dados principais
        linhas = []
        # Documento - Estado
        doc_val = data.get('documento', '-')
        doc_uf = data.get('documento_estado') or ''
        if doc_uf:
            linhas.append(f"Documento: {doc_val} - {doc_uf}")
        else:
            linhas.append(f"Documento: {doc_val}")
        # Endereço detalhado
        rua = data.get('endereco_rua') or ''
        apt = data.get('endereco_apt') or ''
        cidade = data.get('endereco_cidade') or ''
        est = data.get('endereco_estado') or ''
        zipc = data.get('endereco_zipcode') or ''
        endereco_fmt = rua
        if apt:
            endereco_fmt += f", {apt}"
        cidade_linha = ", ".join([p for p in [cidade, est] if p])
        if cidade_linha:
            endereco_fmt += f" - {cidade_linha}"
        if zipc:
            endereco_fmt += f" {zipc}"
        if endereco_fmt.strip():
            linhas.append(f"Endereço: {endereco_fmt}")
        if data.get('data_nascimento'):
            linhas.append(f"Data de Nascimento: {_format_us_date(data.get('data_nascimento'))}")
        if data.get('genero'):
            linhas.append(f"Gênero: {data.get('genero')}")
        if data.get('estado_civil'):
            linhas.append(f"Estado Civil: {data.get('estado_civil')}")
        # Telefone removido do fluxo
        if data.get('tempo_de_seguro'):
            linhas.append(f"Tempo de Seguro: {data.get('tempo_de_seguro')}")
        if data.get('tempo_no_endereco'):
            linhas.append(f"Tempo no Endereço: {data.get('tempo_no_endereco')}")
        if data.get('documento_estado'):
            linhas.append(f"Estado do Documento: {data.get('documento_estado')}")
        if data.get('email'):
            linhas.append(f"Email: {data.get('email')}")

        # Cônjuge
        if data.get('nome_conjuge'):
            linhas.append("\nCônjuge:")
            linhas.append(f"Nome: {data.get('nome_conjuge')}")
            if data.get('data_nascimento_conjuge'):
                linhas.append(f"Data de Nascimento: {_format_us_date(data.get('data_nascimento_conjuge'))}")
            if data.get('documento_conjuge'):
                linhas.append(f"Documento: {data.get('documento_conjuge')}")

        # Veículos e Pessoas
        linhas.append(_formatar_veiculos(data.get('veiculos')))
        linhas.append(_formatar_pessoas(data.get('pessoas')))

        if data.get('observacoes'):
            linhas.append("\nObservações:\n" + str(data.get('observacoes')))

        desc = "\n".join([l for l in linhas if l is not None and l != ''])

        params = {
            'key': key,
            'token': token,
            'idList': list_id,
            'name': name,
            'desc': desc
        }

        resp = requests.post(url, params=params, timeout=20)
        try:
            resp.raise_for_status()
        except requests.exceptions.HTTPError:
            # Retorna mensagem mais clara sem vazar credenciais
            try:
                detail = resp.json()
            except Exception:
                detail = {'text': resp.text[:500]}
            return jsonify({'error': f'Trello retornou {resp.status_code}', 'detail': detail}), resp.status_code

        json_resp = resp.json()
        card_id = json_resp.get('id')

        # Se houver arquivos, anexar ao card
        attach_results = []
        attach_errors = []
        if files and card_id:
            base = 'https://api.trello.com/1'
            for f in files:
                try:
                    fname = secure_filename(f.filename or 'imagem')
                    files_payload = {'file': (fname, f.stream, f.mimetype or 'application/octet-stream')}
                    aresp = requests.post(
                        f"{base}/cards/{card_id}/attachments",
                        params={'key': key, 'token': token, 'name': fname},
                        files=files_payload,
                        timeout=30
                    )
                    if aresp.ok:
                        aj = aresp.json()
                        attach_results.append({'id': aj.get('id'), 'name': aj.get('name')})
                    else:
                        attach_errors.append({'status': aresp.status_code, 'text': aresp.text[:200]})
                except requests.exceptions.RequestException as e:
                    attach_errors.append({'error': _sanitize(str(e))[:200]})

        return jsonify({'ok': True, 'card_id': card_id, 'attachments': attach_results, 'attachment_errors': attach_errors}), 201

    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Erro ao comunicar com Trello: {_sanitize(str(e))}'}), 502
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500
