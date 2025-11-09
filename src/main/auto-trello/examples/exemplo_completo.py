"""
Exemplo completo com veículos, pessoas e anexos
"""

from trello_client import TrelloClient
import os

def exemplo_completo():
    """Exemplo completo com todas as funcionalidades"""
    
    # Inicializar cliente
    trello = TrelloClient()
    
    # Dados dos veículos
    veiculos = [
        {
            'vin': '1HGBH41JXMN109186',
            'placa': 'ABC1234',
            'financiado': 'Quitado',
            'tempo_com_veiculo': '2 anos',
            'ano': '2021',
            'marca': 'Honda',
            'modelo': 'Civic'
        },
        {
            'vin': '2FMDK3KC3DBA12345',
            'placa': 'XYZ5678',
            'financiado': 'Financiado',
            'tempo_com_veiculo': '1 ano',
            'ano': '2020',
            'marca': 'Ford',
            'modelo': 'Edge'
        }
    ]
    
    # Dados de pessoas extras (drivers)
    pessoas = [
        {
            'nome': 'Maria Silva',
            'documento': '987.654.321-00',
            'data_nascimento': '1992-03-20',
            'parentesco': 'Cônjuge',
            'genero': 'Feminino'
        },
        {
            'nome': 'Pedro Silva',
            'documento': '111.222.333-44',
            'data_nascimento': '2005-08-10',
            'parentesco': 'Filho',
            'genero': 'Masculino'
        }
    ]
    
    # Criar card com todas as informações
    card_id = trello.criar_carta(
        nome="João Silva",
        documento="123.456.789-00",
        endereco="656 Waquoit Hwy, East Falmouth, MA, 02536",
        data_nascimento="1990-05-15",
        tempo_de_seguro="5 anos",
        tempo_no_endereco="3 anos",
        veiculos=veiculos,
        pessoas=pessoas,
        # Informações do cônjuge (opcional)
        nome_conjuge="Maria Silva",
        data_nascimento_conjuge="1992-03-20",
        documento_conjuge="987.654.321-00"
    )
    
    if card_id:
        print(f"✅ Card criado com sucesso!")
        print(f"📋 ID: {card_id}")
        print(f"🔗 Link: https://trello.com/c/{card_id}")
        return card_id
    else:
        print("❌ Erro ao criar card")
        return None

def exemplo_anexar_arquivo(card_id):
    """Exemplo de anexação de arquivo"""
    
    trello = TrelloClient()
    
    # Caminho para um arquivo de exemplo
    arquivo = "documento.pdf"
    
    if os.path.exists(arquivo):
        resultado = trello.anexar_arquivo(card_id, arquivo)
        
        if resultado.get('success'):
            print(f"✅ Arquivo anexado com sucesso!")
        else:
            print(f"❌ Erro ao anexar arquivo: {resultado.get('error')}")
    else:
        print(f"⚠️  Arquivo '{arquivo}' não encontrado")

def exemplo_anexar_multiplos():
    """Exemplo de anexação de múltiplos arquivos"""
    
    trello = TrelloClient()
    
    # Primeiro criar o card
    card_id = trello.criar_carta(
        nome="Cliente Teste",
        documento="000.000.000-00",
        endereco="Endereço Teste",
        data_nascimento="2000-01-01"
    )
    
    if not card_id:
        print("❌ Erro ao criar card")
        return
    
    # Lista de arquivos para anexar
    arquivos = [
        "documento1.pdf",
        "foto_veiculo.jpg",
        "cnh.pdf"
    ]
    
    # Filtrar apenas arquivos que existem
    arquivos_existentes = [a for a in arquivos if os.path.exists(a)]
    
    if arquivos_existentes:
        resultado = trello.anexar_multiplos_arquivos(card_id, arquivos_existentes)
        
        print(f"\n📊 Resultado da anexação:")
        print(f"   Total: {resultado['total']}")
        print(f"   Sucesso: {len(resultado['sucesso'])}")
        print(f"   Falhas: {len(resultado['falha'])}")
        
        if resultado['sucesso']:
            print(f"\n✅ Arquivos anexados com sucesso:")
            for item in resultado['sucesso']:
                print(f"   - {item['arquivo']}")
        
        if resultado['falha']:
            print(f"\n❌ Arquivos com falha:")
            for item in resultado['falha']:
                print(f"   - {item['arquivo']}: {item['erro']}")
    else:
        print("⚠️  Nenhum arquivo encontrado para anexar")

if __name__ == "__main__":
    print("=" * 70)
    print("EXEMPLO COMPLETO - TRELLO CLIENT")
    print("=" * 70)
    
    # Criar card completo
    card_id = exemplo_completo()
    
    # Se o card foi criado, tentar anexar arquivos
    if card_id:
        print("\n" + "=" * 70)
        print("ANEXANDO ARQUIVOS")
        print("=" * 70)
        
        exemplo_anexar_arquivo(card_id)
    
    print("\n" + "=" * 70)
    print("EXEMPLO DE MÚLTIPLOS ANEXOS")
    print("=" * 70)
    
    exemplo_anexar_multiplos()