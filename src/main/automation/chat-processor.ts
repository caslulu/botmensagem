import type { Page } from 'playwright';
import { config } from './config';
import type WhatsAppService from './whatsapp-service';
import type MessageSender from './message-sender';
import type Logger from './utils/logger';
import type { ValidatedAutomationProfile } from './types';

class ChatProcessor {
  private processedChats = new Set<string>();

  constructor(
    private readonly logger: Logger,
    private readonly whatsappService: WhatsAppService,
    private readonly messageSender: MessageSender
  ) {}

  async processVisibleChats(
    page: Page,
    profile: ValidatedAutomationProfile,
    checkStop?: () => boolean
  ): Promise<number> {
    const sendLimit = profile.sendLimit || config.DEFAULT_SEND_LIMIT;
    let newChatsProcessed = 0;

    while (this.processedChats.size < sendLimit) {
      if (checkStop && checkStop()) break;

      const chatLocators = await page.getByRole('listitem').all();
      
      if (!chatLocators.length) {
        this.logger.warn('Nenhum chat visível encontrado');
        break;
      }

      let newChatsOnScreen = 0;

      for (const chatLocator of chatLocators) {
        if (checkStop && checkStop()) break;
        if (this.processedChats.size >= sendLimit) break;

        const backButton = page.locator('span[data-icon="back"], [aria-label="Voltar"], [aria-label="Back"]').first();
        const title = page.locator('header').getByText(/Arquivadas|Archived/i).first();
        
        const isInArchived = (await backButton.isVisible().catch(() => false)) || (await title.isVisible().catch(() => false));
        
        if (!isInArchived) {
           this.logger.warn('Detectado saída da seção Arquivadas. Tentando retornar...');
           await this.whatsappService.goToArchivedChats(page).catch((e: any) => this.logger.error('Falha ao retornar para Arquivadas', e));
           break;
        }

        try {
          const titleLocator = chatLocator.locator('span[title]').first();
          try {
            await titleLocator.waitFor({ state: 'attached', timeout: 3000 });
          } catch (e) {
            continue;
          }
          
          const chatName = await titleLocator.getAttribute('title');

          if (!chatName || this.processedChats.has(chatName)) {
            continue;
          }

          newChatsOnScreen++;
          this.logger.info(`Processando "${chatName}" (${this.processedChats.size + 1}/${sendLimit})`);

          await chatLocator.click();
          await this.messageSender.send(page, profile.message, profile.imagePath ?? null);
          this.processedChats.add(chatName);

          this.logger.info('Mensagem enviada. Aguardando intervalo.');
          await page.waitForTimeout(config.MESSAGE_DELAY_MS || 1500);

          if (this.processedChats.size > 0 && this.processedChats.size % 5 === 0) {
            const scrollDown = Math.floor(this.processedChats.size / 5) % 2 === 1;
            this.logger.info(`Rolando a lista (${scrollDown ? 'baixo' : 'cima'}) após ${this.processedChats.size} envios...`);
            await page.locator('div[aria-label="Lista de conversas"], div[role="grid"]').first().focus().catch(() => {});
            for (let i = 0; i < 3; i++) {
              if (checkStop && checkStop()) break;
              await page.keyboard.press(scrollDown ? 'PageDown' : 'PageUp');
              await page.waitForTimeout(200);
            }
          }

          newChatsProcessed++;

        } catch (error: any) {
          this.logger.error(`Erro ao processar chat`, error);
          const isChatListVisible = await page.locator('[data-testid="chat-list"]').isVisible().catch(() => false);
          
          if (!isChatListVisible) {
            const backButton = page.getByRole('button', { name: 'Voltar' });
            const isBackVisible = await backButton.isVisible().catch(() => false);
            if (!isBackVisible) {
              await page.keyboard.press('Escape');
              await page.waitForTimeout(1000);
            }
          }
        }
      }

      if (newChatsOnScreen === 0 || this.processedChats.size >= sendLimit) {
        if (newChatsOnScreen === 0) {
          this.logger.info('Nenhum chat novo encontrado nesta tela');
        }
        break;
      }
    }

    return newChatsProcessed;
  }

  async waitUntilConnected(page: Page, checkStop?: () => boolean): Promise<boolean> {
    this.logger.warn('Conexão com WhatsApp perdida. Aguardando reconexão...');
    let delay = 1000;
    const maxDelay = 10000;

    while (true) {
      if (checkStop && checkStop()) {
        this.logger.warn('Parada solicitada durante reconexão. Encerrando.');
        return false;
      }

      const ok = await this.whatsappService.isConnected(page);
      if (ok) {
        this.logger.success('Reconectado ao WhatsApp Web. Retomando envios.');
        return true;
      }

      await page.waitForTimeout(delay);
      delay = Math.min(maxDelay, Math.floor(delay * 1.5));
    }
  }

  async processMultipleIterations(page: Page, profile: ValidatedAutomationProfile, checkStop?: () => boolean): Promise<number> {
    const sendLimit = profile.sendLimit || config.DEFAULT_SEND_LIMIT;
    let iteration = 0;
    let consecutiveEmptyIterations = 0;

    while (this.processedChats.size < sendLimit) {
      iteration += 1;

      if (checkStop && checkStop()) {
        break;
      }

      this.logger.info(`Iteração ${iteration} - Chats enviados: ${this.processedChats.size}/${sendLimit}`);

      const processedThisIteration = await this.processVisibleChats(page, profile, checkStop);

      if (processedThisIteration === 0) {
        consecutiveEmptyIterations += 1;
        this.logger.info('Nenhum chat novo encontrado nesta passada.');
        if (consecutiveEmptyIterations >= 3) {
          this.logger.info('Sem novos chats após várias tentativas. Encerrando.');
          break;
        }
      } else {
        consecutiveEmptyIterations = 0;
      }

      if (this.processedChats.size >= sendLimit) {
        this.logger.success(`Limite de ${sendLimit} envios atingido`);
        break;
      }

      await page.waitForTimeout(3000);
    }

    return this.processedChats.size;
  }

  getTotalProcessed(): number {
    return this.processedChats.size;
  }

  reset(): void {
    this.processedChats.clear();
  }
}

export default ChatProcessor;
