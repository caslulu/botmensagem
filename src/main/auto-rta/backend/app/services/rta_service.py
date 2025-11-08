from datetime import datetime
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, NumberObject, TextStringObject
import io
import os

class RTAService:
    def __init__(self):
        # Obter caminho absoluto para os templates
        current_dir = os.path.dirname(os.path.abspath(__file__))
        assets_dir = os.path.join(current_dir, '..', 'assets')
        
        self.templates = {
            'allstate': os.path.join(assets_dir, 'rta_template_allstate.pdf'),
            'progressive': os.path.join(assets_dir, 'rta_template_progressive.pdf'),
            'geico': os.path.join(assets_dir, 'rta_template_geico.pdf'),
            'liberty': os.path.join(assets_dir, 'rta_template_liberty.pdf')
        }
        
    def get_template_path(self, insurance_company):
        """Retorna o caminho do template baseado na seguradora"""
        template_path = self.templates.get(insurance_company, self.templates['allstate'])
        print(f"DEBUG: Tentando acessar template: {template_path}")
        print(f"DEBUG: Arquivo existe: {os.path.exists(template_path)}")
        return template_path


    def _format_date(self, date_value):
        """Formata data para MM/DD/YYYY ou retorna string vazia se inválida"""
        if not date_value:
            return ""
        try:
            if hasattr(date_value, 'strftime'):
                return date_value.strftime('%m/%d/%Y')
            else:
                # Se for string, tenta converter
                from datetime import datetime
                if isinstance(date_value, str):
                    # Tenta diferentes formatos
                    for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y']:
                        try:
                            parsed_date = datetime.strptime(date_value, fmt)
                            return parsed_date.strftime('%m/%d/%Y')
                        except ValueError:
                            continue
                return ""
        except Exception:
            return ""

    def _color_checkbox(self, selected_color, target_color):
        """Marca a cor correta no PDF"""
        return NameObject("/On") if selected_color == target_color else NameObject("/Off")

    def preencher_rta(self, data):
        """
        Preenche o RTA com base nos dados fornecidos
        :param data: Dicionário com os dados do formulário
        :return: BytesIO object com o PDF preenchido
        """
        # Determinar qual template usar
        insurance_company = data.get('insurance_company', 'allstate')
        template_path = self.get_template_path(insurance_company)
        
        reader = PdfReader(template_path)
        writer = PdfWriter()
        writer.append(reader)

        # Debug: verificar se a data de nascimento está sendo processada
        owner_dob_value = data.get('owner_dob', '')
        print(f"DEBUG RTA Service - owner_dob: {owner_dob_value} (tipo: {type(owner_dob_value)})")
        formatted_dob = self._format_date(owner_dob_value)
        print(f"DEBUG RTA Service - Data formatada: '{formatted_dob}'")
        
        # Debug: verificar campos extras do veículo
        print(f"DEBUG - Campos extras recebidos:")
        print(f"  Year: {data.get('year', 'N/A')}")
        print(f"  Make: {data.get('make', 'N/A')}")
        print(f"  Model: {data.get('model', 'N/A')}")
        print(f"  Cylinders: {data.get('cylinders', 'N/A')}")
        print(f"  Passengers: {data.get('passengers', 'N/A')}")
        print(f"  Doors: {data.get('doors', 'N/A')}")
        print(f"  Odometer: {data.get('odometer', 'N/A')}")
        print(f"  Previous Title Number: {data.get('previous_title_number', 'N/A')}")
        print(f"  Previous Title State: {data.get('previous_title_state', 'N/A')}")
        print(f"  Previous Title Country: {data.get('previous_title_country', 'N/A')}")

        # Endereço do vendedor - usando campos separados
        seller_rua = str(data.get('seller_street', ''))
        seller_cidade = str(data.get('seller_city', ''))
        seller_estado = str(data.get('seller_state', ''))
        seller_cep = str(data.get('seller_zipcode', ''))
        
        # Endereço do proprietário - usando campos separados
        endereco_rua = str(data.get('owner_street', ''))
        endereco_cidade = str(data.get('owner_city', ''))
        endereco_estado = str(data.get('owner_state', ''))
        endereco_cep = str(data.get('owner_zipcode', ''))
        
        print(f"DEBUG - Endereços separados:")
        print(f"  Seller: {seller_rua}, {seller_cidade}, {seller_estado}, {seller_cep}")
        print(f"  Owner: {endereco_rua}, {endereco_cidade}, {endereco_estado}, {endereco_cep}")

        # Campos do PDF
        campos = {
            # Seller Info
            "(L1) Seller name (Please print)": str(data.get('seller_name', '')),
            "(L2) (Seller) Address": seller_rua,
            # "(L2) (Seller) Apt": seller_apt,  # Campo não existe no PDF
            "(L2) (Seller) City": seller_cidade,
            "(L2) (Seller) State": seller_estado,
            "(L2) (Seller) Zip Code": seller_cep,
            # Sale Info
            "(I3) Gross Sale Price (Proof Required)": str(data.get('gross_sale_price', '')),
            # Purchase Info
            "(J1) Purchase Date": self._format_date(data.get('purchase_date', '')),
            # Insurance Info
            "(K3) Effective Date of Insurance": self._format_date(data.get('insurance_effective_date', '')),
            # Owner 1 Information
            "(D2) (First Owner's) Name (Last, First, Middle)": str(data.get('owner_name', '')),
            "(D3) (Owner 1) Date of Birth (MM [Month]/DD [Day]/YYYY[Year])": formatted_dob,
            "(D4) (Owner 1) License Number/ ID (Identification) Number / SSN (Social Security Number)": str(data.get('owner_license', '')),
            "(D5) (Owner 1) Residential Address": endereco_rua,
            "(D5) (Owner 1) City": endereco_cidade,
            "(D5) (Owner 1) State": endereco_estado,
            "(D5) (Owner 1) Zip Code": endereco_cep,
            # Garaging Address (G1) - igual ao endereço residencial
            "(G1) (Garaging) Address": endereco_rua,
            "(G1) (Garaging Address) City": endereco_cidade,
            "(G1) (Garaging Address) State": endereco_estado,
            "(G1) (Garaging Address) Zip Code": endereco_cep,
            # VIN
            "(B1) Vehicle Identification Number (VIN)": str(data.get('vin', '')),
            # Body Style
            "(B2) Body Style": str(data.get('body_style', '')),
            # Year, Make, Model - seção B5 (nomes corretos do PDF)
            "(B5) Vehicle Year": str(data.get('year', '')),
            "(B5) (Vehicle) Make": str(data.get('make', '')),
            "(B5) (Vehicle) Model": str(data.get('model', '')),
            # Campos extras do veículo - seção B7
            "(B7) Number of cylinders": str(data.get('cylinders', '')),
            "(B7) Number of passengers": str(data.get('passengers', '')),
            "(B7) Number of doors": str(data.get('doors', '')),
            # Odometer - seção B9
            "(B9) Odometer (Miles)": str(data.get('odometer', '')),
            # Previous Title Information - seção C3
            "(C3) Previous title number": str(data.get('previous_title_number', '')),
            "(C3) Previous title state": str(data.get('previous_title_state', '')),
            "(C3) Previous title country": str(data.get('previous_title_country', '')),
            # Cores (checkboxes)
            "(B4) Black": self._color_checkbox(data.get('color', ''), "Black"),
            "(B4 ) White": self._color_checkbox(data.get('color', ''), "White"),
            "(B4) Brown": self._color_checkbox(data.get('color', ''), "Brown"),
            "(B4) Blue": self._color_checkbox(data.get('color', ''), "Blue"),
            "(B4) Yellow": self._color_checkbox(data.get('color', ''), "Yellow"),
            "(B4) Gray": self._color_checkbox(data.get('color', ''), "Gray"),
            "(B4 ) Purple": self._color_checkbox(data.get('color', ''), "Purple"),
            "(B4) Green": self._color_checkbox(data.get('color', ''), "Green"),
            "(B4) Orange": self._color_checkbox(data.get('color', ''), "Orange"),
            "(B4) Red": self._color_checkbox(data.get('color', ''), "Red"),
            "(B4) Silver": self._color_checkbox(data.get('color', ''), "Silver"),
            "(B4) Gold": self._color_checkbox(data.get('color', ''), "Gold"),
        }

        # Preenche os campos do PDF
        for page in writer.pages:
            if "/Annots" in page:
                for annot in page["/Annots"]:
                    obj = annot.get_object()
                    field_name = obj.get("/T")
                    if field_name and field_name in campos:
                        value = campos[field_name]
                        obj.update({NameObject("/Ff"): NumberObject(0)})
                        field_type = obj.get("/FT")
                        if field_type == "/Btn":
                            obj.update({NameObject("/V"): value, NameObject("/AS"): value})
                        elif field_type == "/Tx":
                            obj.update({NameObject("/V"): TextStringObject(str(value))})
        writer.set_need_appearances_writer(True)

        pdf_io = io.BytesIO()
        writer.write(pdf_io)
        pdf_io.seek(0)
        return pdf_io
