"""
Exemplo básico de uso do TrelloClient
"""

from trello_client import TrelloClient

def exemplo_simples():
    """Exemplo de criação de card simples"""
    
    # Inicializar cliente
    trello = TrelloClient()
    
    # Criar card básico
    card_id = trello.criar_carta(
        nome="João Silva",
        documento="123.456.789-00",
        endereco="Rua Exemplo, 123, São Paulo, SP, 01234-567",
        data_nascimento="1990-05-15",
        tempo_de_seguro="2 anos",
        tempo_no_endereco="3 anos"
    )
    
    if card_id:
        print(f"✅ Card criado com sucesso! ID: {card_id}")
        print(f"🔗 Link: https://trello.com/c/{card_id}")
    else:
        print("❌ Erro ao criar card")

def exemplo_com_email():
    """Exemplo com email personalizado"""
    
    trello = TrelloClient()
    
    card_id = trello.criar_carta(
        nome="Maria Santos",
        documento="987.654.321-00",
        endereco="Av. Paulista, 1000, São Paulo, SP",
        data_nascimento="1985-12-20",
        email="maria.santos@gmail.com",  # Email personalizado
        tempo_de_seguro="5 anos",
        tempo_no_endereco="1 ano"
    )
    
    print(f"Card criado: {card_id}")

def exemplo_buscar_card():
    """Exemplo de busca de card"""
    
    trello = TrelloClient()
    
    # Substitua pelo ID de um card existente
    card_id = "seu_card_id_aqui"
    
    card_info = trello.buscar_card(card_id)
    
    if card_info:
        print(f"Nome do card: {card_info.get('name')}")
        print(f"Descrição: {card_info.get('desc')}")
    else:
        print("Card não encontrado")

if __name__ == "__main__":
    print("=" * 60)
    print("EXEMPLO BÁSICO - TRELLO CLIENT")
    print("=" * 60)
    
    exemplo_simples()
    
    print("\n" + "=" * 60)
    print("EXEMPLO COM EMAIL PERSONALIZADO")
    print("=" * 60)
    
    exemplo_com_email()