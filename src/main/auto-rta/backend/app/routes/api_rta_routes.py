from flask import Blueprint, request, jsonify, send_file
from app.services.rta_service import RTAService
import io
from datetime import datetime

api_rta_bp = Blueprint('api_rta', __name__, url_prefix='/api')
rta_service = RTAService()

@api_rta_bp.route('/rta', methods=['POST'])
def generate_rta():
    """
    API endpoint para gerar RTA
    Espera JSON com os dados do formulário
    
    Exemplo de request:
    {
        "owner_name": "Alves, Caio",
        "owner_dob": "2000-10-20",
        "owner_license": "123456789",
        "owner_residential_address": "656 Waquoit Hwy, East Falmouth, MA, 02536",
        "vin": "1HGBH41JXMN109186",
        "body_style": "Sedan",
        "color": "Blue",
        "year": 2021,
        "make": "Honda",
        "model": "Civic"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400
        
        # Validar campos obrigatórios base
        required_fields = [
            'insurance_company', 'owner_name', 'owner_dob', 'owner_license', 
            'owner_street', 'owner_city', 'owner_state', 'owner_zipcode', 'owner_license_issued_state',
            'vin', 'body_style', 'color', 'year', 'make', 'model', 'cylinders', 'passengers', 'doors', 'odometer',
            'seller_name', 'seller_street', 'seller_city', 'seller_state', 'seller_zipcode',
            'gross_sale_price', 'purchase_date', 'insurance_effective_date', 'insurance_policy_change_date',
            'vehicle_financing_status'
        ]
        
        # Se o veículo for quitado, adicionar campos do título anterior como obrigatórios
        if data.get('vehicle_financing_status') == 'paid_off':
            required_fields.extend(['previous_title_number', 'previous_title_state', 'previous_title_country'])
        
        missing_fields = []
        
        for field in required_fields:
            if field not in data or (data[field] == '' or data[field] is None):
                missing_fields.append(field)
        
        if missing_fields:
            return jsonify({
                'error': 'Campos obrigatórios faltando',
                'missing_fields': missing_fields
            }), 400
        
        # Validar seguradora
        if data.get('insurance_company') not in ['allstate', 'progressive', 'geico', 'liberty']:
            return jsonify({
                'error': 'Seguradora deve ser "allstate", "progressive", "geico" ou "liberty"'
            }), 400
        
        # Combinar endereços separados em campos únicos para compatibilidade com o serviço
        if all(key in data for key in ['owner_street', 'owner_city', 'owner_state', 'owner_zipcode']):
            data['owner_residential_address'] = f"{data['owner_street']}, {data['owner_city']}, {data['owner_state']}, {data['owner_zipcode']}"
        
        if all(key in data for key in ['seller_street', 'seller_city', 'seller_state', 'seller_zipcode']):
            data['seller_address'] = f"{data['seller_street']}, {data['seller_city']}, {data['seller_state']}, {data['seller_zipcode']}"
        
        # Gerar PDF
        pdf_io = rta_service.preencher_rta(data)
        
        return send_file(
            pdf_io,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'rta_{data.get("insurance_company")}_{data.get("owner_name", "documento").replace(" ", "_")}.pdf'
        )
        
    except Exception as e:
        print(f"Erro ao gerar RTA: {str(e)}")
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@api_rta_bp.route('/rta/fields', methods=['GET'])
def get_rta_fields():
    """
    Retorna a estrutura dos campos necessários para o RTA
    """
    fields = {
        'required': [
            {
                'name': 'owner_name',
                'type': 'string',
                'label': 'Nome do Proprietário',
                'placeholder': 'Sobrenome, Nome, Nome do Meio',
                'validation': 'required'
            },
            {
                'name': 'owner_dob',
                'type': 'date',
                'label': 'Data de Nascimento',
                'placeholder': 'YYYY-MM-DD',
                'validation': 'required'
            },
            {
                'name': 'owner_license',
                'type': 'string',
                'label': 'CNH/Driver License',
                'placeholder': 'Número da carteira de motorista',
                'validation': 'required'
            },
            {
                'name': 'owner_residential_address',
                'type': 'string',
                'label': 'Endereço Residencial',
                'placeholder': 'Rua Número, Cidade, Estado, CEP',
                'validation': 'required'
            },
            {
                'name': 'vin',
                'type': 'string',
                'label': 'VIN',
                'placeholder': '17 caracteres',
                'validation': 'required|length:17'
            },
            {
                'name': 'body_style',
                'type': 'string',
                'label': 'Tipo de Carroceria',
                'placeholder': 'Ex: Sedan, SUV, Hatchback',
                'validation': 'required'
            },
            {
                'name': 'color',
                'type': 'select',
                'label': 'Cor',
                'options': [
                    'Black', 'White', 'Brown', 'Blue', 'Yellow', 'Gray',
                    'Purple', 'Green', 'Orange', 'Red', 'Silver', 'Gold'
                ],
                'validation': 'required'
            },
            {
                'name': 'year',
                'type': 'number',
                'label': 'Ano',
                'placeholder': '2024',
                'validation': 'required|min:1900|max:2030'
            },
            {
                'name': 'make',
                'type': 'string',
                'label': 'Marca',
                'placeholder': 'Ex: Toyota, Honda, Ford',
                'validation': 'required'
            },
            {
                'name': 'model',
                'type': 'string',
                'label': 'Modelo',
                'placeholder': 'Ex: Corolla, Civic, Focus',
                'validation': 'required'
            }
        ],
        'optional': [
            {
                'name': 'owner_license_issued_state',
                'type': 'string',
                'label': 'Estado Emissor da CNH',
                'placeholder': 'Ex: MA, CA, FL'
            },
            {
                'name': 'gross_sale_price',
                'type': 'string',
                'label': 'Preço de Venda',
                'placeholder': 'Ex: $25,000'
            },
            {
                'name': 'purchase_date',
                'type': 'date',
                'label': 'Data de Compra',
                'placeholder': 'YYYY-MM-DD'
            },
            {
                'name': 'insurance_effective_date',
                'type': 'date',
                'label': 'Data Início do Seguro',
                'placeholder': 'YYYY-MM-DD'
            },
            {
                'name': 'insurance_policy_change_date',
                'type': 'date',
                'label': 'Data Alteração da Apólice',
                'placeholder': 'YYYY-MM-DD'
            },
            {
                'name': 'seller_name',
                'type': 'string',
                'label': 'Nome do Vendedor',
                'placeholder': 'Nome completo do vendedor'
            },
            {
                'name': 'seller_address',
                'type': 'string',
                'label': 'Endereço do Vendedor',
                'placeholder': 'Endereço completo do vendedor'
            },
            {
                'name': 'odometer',
                'type': 'number',
                'label': 'Quilometragem',
                'placeholder': 'Milhas no odômetro'
            },
            {
                'name': 'cylinders',
                'type': 'number',
                'label': 'Cilindros',
                'placeholder': 'Número de cilindros do motor'
            },
            {
                'name': 'passengers',
                'type': 'number',
                'label': 'Passageiros',
                'placeholder': 'Número de passageiros'
            },
            {
                'name': 'doors',
                'type': 'number',
                'label': 'Portas',
                'placeholder': 'Número de portas'
            },
            {
                'name': 'previous_title_number',
                'type': 'string',
                'label': 'Número do Título Anterior',
                'placeholder': 'Número do título anterior'
            },
            {
                'name': 'previous_title_state',
                'type': 'string',
                'label': 'Estado do Título Anterior',
                'placeholder': 'Estado emissor do título anterior'
            },
            {
                'name': 'previous_title_country',
                'type': 'string',
                'label': 'País do Título Anterior',
                'placeholder': 'País emissor do título anterior'
            }
        ]
    }
    
    return jsonify(fields)

@api_rta_bp.route('/rta/validate', methods=['POST'])
def validate_rta_data():
    """
    Valida os dados do RTA sem gerar o PDF
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400
        
        errors = []
        warnings = []
        
        # Validar campos obrigatórios
        required_fields = [
            'owner_name', 'owner_dob', 'owner_license', 'owner_residential_address',
            'vin', 'body_style', 'color', 'year', 'make', 'model'
        ]
        
        for field in required_fields:
            if field not in data or not data[field]:
                errors.append(f'Campo obrigatório: {field}')
        
        # Validar VIN
        if 'vin' in data and data['vin']:
            if len(str(data['vin'])) != 17:
                errors.append('VIN deve ter exatamente 17 caracteres')
        
        # Validar ano
        if 'year' in data and data['year']:
            try:
                year = int(data['year'])
                if year < 1900 or year > 2030:
                    errors.append('Ano deve estar entre 1900 e 2030')
            except (ValueError, TypeError):
                errors.append('Ano deve ser um número válido')
        
        # Validar datas
        date_fields = ['owner_dob', 'purchase_date', 'insurance_effective_date', 'insurance_policy_change_date']
        for field in date_fields:
            if field in data and data[field]:
                try:
                    datetime.strptime(data[field], '%Y-%m-%d')
                except ValueError:
                    errors.append(f'Data inválida para {field}. Use formato YYYY-MM-DD')
        
        # Validar cor
        valid_colors = ['Black', 'White', 'Brown', 'Blue', 'Yellow', 'Gray', 'Purple', 'Green', 'Orange', 'Red', 'Silver', 'Gold']
        if 'color' in data and data['color'] not in valid_colors:
            errors.append(f'Cor inválida. Cores válidas: {", ".join(valid_colors)}')
        
        # Avisos para campos opcionais importantes
        optional_important = ['odometer', 'cylinders', 'passengers', 'doors']
        for field in optional_important:
            if field not in data or not data[field]:
                warnings.append(f'Campo opcional mas recomendado: {field}')
        
        return jsonify({
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'total_errors': len(errors),
            'total_warnings': len(warnings)
        })
        
    except Exception as e:
        return jsonify({'error': f'Erro na validação: {str(e)}'}), 500