"""
Script de teste rápido para verificar se o módulo está funcionando
"""

from trello_client import TrelloClient

def testar_conexao():
    """Testa se as credenciais estão corretas"""
    try:
        trello = TrelloClient()
        print("✅ Cliente Trello inicializado com sucesso!")
        print(f"   API Key: {trello.api_key[:10]}...")
        print(f"   List ID: {trello.list_id}")
        return True
    except ValueError as e:
        print(f"❌ Erro: {e}")
        return False
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
        return False

def testar_email():
    """Testa a geração de email"""
    trello = TrelloClient()
    
    testes = [
        "João Silva",
        "Maria Santos",
        "Pedro Oliveira Junior"
    ]
    
    print("\n📧 Testando geração de emails:")
    for nome in testes:
        email = trello.gerar_email(nome)
        print(f"   {nome} → {email}")

if __name__ == "__main__":
    print("=" * 60)
    print("TESTE DO MÓDULO TRELLO")
    print("=" * 60)
    
    if testar_conexao():
        testar_email()
        
        print("\n" + "=" * 60)
        print("✅ Módulo funcionando corretamente!")
        print("=" * 60)
        print("\nPróximos passos:")
        print("1. Execute: python examples/exemplo_basico.py")
        print("2. Execute: python examples/exemplo_completo.py")
    else:
        print("\n" + "=" * 60)
        print("❌ Configure o arquivo .env antes de continuar")
        print("=" * 60)
        print("\nInstruções:")
        print("1. Copie .env.example para .env")
        print("2. Preencha com suas credenciais do Trello")
        print("3. Execute este teste novamente")