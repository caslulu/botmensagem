import os
import time
from playwright.sync_api import sync_playwright, TimeoutError

# --- CONFIGURAÇÕES ---
USER_DATA_DIR = os.path.join(os.getcwd(), 'whatsapp_session_data')
NOME_DO_ARQUIVO_DE_IMAGEM = "imagem_enviar.jpg"
TEXTO_DA_LEGENDA = """
🚨 *PARE DE PAGAR CARO NO SEGURO!* 🚨
👉 Carro | Moto

💰 *ECONOMIZE ATÉ 50% AGORA!*
✅ As melhores taxas do mercado
✅ Cotações rápidas, sem enrolação

📋 *Aceitamos:*
• Drivh
• CNH brasileira
• Passaporte
• Habilitação estrangeira

🧑‍💼 Thiago | Seu Corretor de Confiança
Fale comigo no WhatsApp e receba sua cotação em minutos:
👉 https://wa.me/message/BMDAOE4YSM7HN1
"""
DELAY_ENTRE_MENSAGENS = 2
LIMITE_DE_ENVIOS = 20
QUANTIDADE_LOOP = 10

def enviar_mensagens_com_rolagem_continua():
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(user_data_dir=USER_DATA_DIR, headless=False, slow_mo=50)
        page = context.new_page()
        try:
            print("Abrindo o WhatsApp Web...")
            page.goto("https://web.whatsapp.com", timeout=90000)
            print("Login bem-sucedido!")
            time.sleep(30)
            print("\nNavegando para a seção de Arquivadas...")
            page.get_by_role('button', name='Arquivadas').click()
            print("Seção de Arquivadas aberta com sucesso.")

            print("\nRolando até o meio da lista para começar...")
            for _ in range(30):
                page.keyboard.press('PageDown')
                time.sleep(0.5)
            print("Posicionado. Iniciando o processo de envio...")
            
            # Controle global de chats processados para evitar repetições
            chats_processados_globalmente = set()
            
            # Loop principal que continua até atingir o limite de envios
            for iteracao in range(1, QUANTIDADE_LOOP + 1):
                if len(chats_processados_globalmente) >= LIMITE_DE_ENVIOS:
                    print(f"\nLimite de {LIMITE_DE_ENVIOS} envios atingido. Encerrando loops.")
                    break
                
                print(f"\n--- ITERAÇÃO {iteracao}/{QUANTIDADE_LOOP} - Chats já processados: {len(chats_processados_globalmente)} ---")
                parte_mensagens(page, chats_processados_globalmente)
                
                if len(chats_processados_globalmente) >= LIMITE_DE_ENVIOS:
                    print(f"Meta de {LIMITE_DE_ENVIOS} envios alcançada!")
                    break
                    
                time.sleep(5)
            
            print("\n" + "="*30)
            print(f"PROCESSO CONCLUÍDO!")
            print("="*30)

        except Exception as e:
            print(f"Ocorreu um erro CRÍTICO no processo: {e}")
        finally:
            input("\nPressione Enter para fechar...")
            context.close()

def parte_mensagens(page, chats_processados):
    while len(chats_processados) < LIMITE_DE_ENVIOS:
        chats_visiveis = page.get_by_role("listitem").all()
        if not chats_visiveis:
            print("Nenhum chat visível para processar.")
            break

        novos_chats_encontrados_nesta_tela = 0
        for chat in chats_visiveis:
            if len(chats_processados) >= LIMITE_DE_ENVIOS:
                print(f"\nLimite de {LIMITE_DE_ENVIOS} envios atingido. Encerrando.")
                break
                
            nome_chat = ""
            try:
                nome_chat = chat.locator('span[title]').first.get_attribute('title', timeout=1000)
                if not nome_chat or nome_chat in chats_processados:
                    continue
                
                novos_chats_encontrados_nesta_tela += 1
                print(f"\n({len(chats_processados) + 1}/{LIMITE_DE_ENVIOS}) Processando: {nome_chat}")
                
                chat.click()
                
                page.get_by_role('button', name='Anexar').click()
                botao_fotos = page.get_by_role("button", name="Fotos e vídeos")
                botao_fotos.wait_for(state='visible', timeout=10000)
                botao_fotos.locator("input[type=\"file\"]").set_input_files(NOME_DO_ARQUIVO_DE_IMAGEM)
                
                caixa_da_legenda = page.get_by_role('textbox', name='Digite uma mensagem')
                caixa_da_legenda.wait_for(timeout=20000)
                caixa_da_legenda.fill(TEXTO_DA_LEGENDA)
                caixa_da_legenda.press('Enter')
                
                chats_processados.add(nome_chat)
                print(f"Mensagem enviada. Aguardando {DELAY_ENTRE_MENSAGENS} segundos...")
                time.sleep(DELAY_ENTRE_MENSAGENS)
                
                if not page.get_by_role('button', name='Voltar').is_visible(timeout=3000):
                    page.keyboard.press('Escape')
                    page.get_by_role('button', name='Voltar').wait_for(state='visible', timeout=5000)

                if len(chats_processados) > 0 and len(chats_processados) % 2 == 0:
                    print(f"\n--- {len(chats_processados)} mensagens enviadas. Rolando a lista para baixo... ---")
                    for _ in range(12):
                        page.keyboard.press('PageDown')
                        time.sleep(0.5) # Pequena pausa para a rolagem acontecer

            except Exception as e:
                print(f"!!! Erro ao processar o chat '{nome_chat}'. Pulando. Detalhes: {e}")
                if not page.get_by_role('button', name='Voltar').is_visible():
                    page.keyboard.press('Escape')
                    time.sleep(1)
        
        if len(chats_processados) >= LIMITE_DE_ENVIOS:
            break
        
        if novos_chats_encontrados_nesta_tela == 0:
            print("\nNenhum chat novo encontrado na tela. Atingimos o fim da lista visível ou todos os chats já foram processados.")
            break
if __name__ == "__main__":
    enviar_mensagens_com_rolagem_continua()
