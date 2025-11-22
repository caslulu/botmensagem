/**
 * Processador de chats - gerencia o envio para múltiplos chats
 */

const config = require('./config');

class ChatProcessor {
  constructor(logger, whatsappService, messageSender) {
    this.logger = logger;
    this.whatsappService = whatsappService;
    this.messageSender = messageSender;
    this.processedChats = new Set();
  }

  /**
   * Processa chats visíveis na tela
   * @param {Page} page - Página do Playwright
   * @param {Object} profile - Perfil ativo
   * @param {Function} checkStop - Função para verificar se deve parar
   * @returns {Promise<number>} Número de novos chats processados
   */
  async processVisibleChats(page, profile, checkStop) {
    const sendLimit = profile.sendLimit || config.DEFAULT_SEND_LIMIT;
    let newChatsProcessed = 0;

    while (this.processedChats.size < sendLimit) {
      if (checkStop && checkStop()) break;

      // Get all list items (chats) directly as in the example
      const chatLocators = await page.getByRole('listitem').all();
      
      if (!chatLocators.length) {
        this.logger.warn('Nenhum chat visível encontrado');
        break;
      }

      let newChatsOnScreen = 0;

      for (const chatLocator of chatLocators) {
        if (checkStop && checkStop()) break;
        if (this.processedChats.size >= sendLimit) break;

        // Ensure we are still in Archived view before processing
        const backButton = page.locator('span[data-icon="back"], [aria-label="Voltar"], [aria-label="Back"]').first();
        const title = page.locator('header').getByText(/Arquivadas|Archived/i).first();
        
        const isInArchived = (await backButton.isVisible().catch(() => false)) || (await title.isVisible().catch(() => false));
        
        if (!isInArchived) {
           this.logger.warn('Detectado saída da seção Arquivadas. Tentando retornar...');
           await this.whatsappService.goToArchivedChats(page).catch(e => this.logger.error('Falha ao retornar para Arquivadas', e));
           // Refresh locators after navigation
           break; // Break inner loop to refresh list
        }

        try {
          // Get title
          const titleLocator = chatLocator.locator('span[title]').first();
          try {
            await titleLocator.waitFor({ state: 'attached', timeout: 3000 });
          } catch (e) {
            // If no title found (e.g. separator, skeleton), skip silently
            continue;
          }
          
          const chatName = await titleLocator.getAttribute('title');

          if (!chatName || this.processedChats.has(chatName)) {
            continue;
          }

          newChatsOnScreen++;
          this.logger.info(`Processando "${chatName}" (${this.processedChats.size + 1}/${sendLimit})`);

          // Click chat
          await chatLocator.click();

          // Send message
          await this.messageSender.send(page, profile.message, profile.imagePath);
          
          // Mark as processed
          this.processedChats.add(chatName);

          // Wait delay
          this.logger.info('Mensagem enviada. Aguardando intervalo.');
          await page.waitForTimeout(config.MESSAGE_DELAY_MS || 2000);

          // Go back logic
          // On desktop (wide screen), the list is always visible, so we don't need to go back.
          // Going back (Escape) might actually close the Archived view.
          // We check if the chat list is visible.
          const isChatListVisible = await page.locator('[data-testid="chat-list"]').isVisible().catch(() => false);
          
          if (!isChatListVisible) {
            // Only try to go back if we can't see the list (mobile view)
            const backButton = page.getByRole('button', { name: 'Voltar' }).or(page.getByRole('button', { name: 'Back' }));
            const isBackVisible = await backButton.isVisible().catch(() => false);
            if (!isBackVisible) {
              await page.keyboard.press('Escape');
              await backButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
            }
          } else {
            // If list is visible, we might be in Archived view.
            // Ensure we don't press Escape, as it would close Archived view.
            // Just to be safe, we can check if we are still in Archived view.
            const archivedHeader = page.locator('span[data-icon="back"], [aria-label="Voltar"], [aria-label="Back"]');
            if (!(await archivedHeader.isVisible())) {
               // If we lost the archived header, maybe we need to re-enter?
               // For now, let's assume we are fine or the next loop will catch it.
            }
          }

          // Scroll logic (every 2 sends)
          if (this.processedChats.size > 0 && this.processedChats.size % 2 === 0) {
            this.logger.info(`Rolando a lista após ${this.processedChats.size} envios...`);
            for (let i = 0; i < 12; i++) {
              if (checkStop && checkStop()) break;
              await page.keyboard.press('PageDown');
              await page.waitForTimeout(500);
            }
          }

          newChatsProcessed++;

        } catch (error) {
          this.logger.error(`Erro ao processar chat`, error);
          // Try to recover
          // Only press Escape if we are NOT in desktop mode (list visible)
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

  /**
   * Processa um chat individual (Legacy - Not used in simplified version)
   */
  async processChat(page, chatLocator, processedKey, chatName, profile) {
    // ... kept for reference or future use if needed, but processVisibleChats now handles everything inline
  }

  /**
   * Aguarda até reconectar (com backoff), ou interrompe se solicitado
   * @param {Page} page
   * @param {Function|null} checkStop
   * @returns {Promise<boolean>} true se reconectou, false se interrompeu
   */
  async waitUntilConnected(page, checkStop) {
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

  /**
   * Executa múltiplas iterações de processamento
   * @param {Page} page - Página do Playwright
   * @param {Object} profile - Perfil ativo
   * @param {Function} checkStop - Função para verificar se deve parar
   * @returns {Promise<number>} Total de chats processados
   */
  async processMultipleIterations(page, profile, checkStop) {
    const sendLimit = profile.sendLimit || config.DEFAULT_SEND_LIMIT;

    for (let iteration = 1; iteration <= config.LOOP_QUANTITY; iteration++) {
      // Verificar se deve parar
      if (checkStop && checkStop()) {
        break;
      }

      // Verificar se atingiu limite
      if (this.processedChats.size >= sendLimit) {
        this.logger.success(`Limite de ${sendLimit} envios atingido`);
        break;
      }

      this.logger.info(
        `Iteração ${iteration}/${config.LOOP_QUANTITY} - ` +
        `Chats enviados: ${this.processedChats.size}/${sendLimit}`
      );

      // Processar chats visíveis
      await this.processVisibleChats(page, profile, checkStop);

      // Verificar novamente após processar
      if (this.processedChats.size >= sendLimit) {
        break;
      }

      // Aguardar antes da próxima iteração
      await page.waitForTimeout(5000);
    }

    return this.processedChats.size;
  }

  /**
   * Obtém o total de chats processados
   * @returns {number}
   */
  getTotalProcessed() {
    return this.processedChats.size;
  }

  /**
   * Reseta o contador de chats processados
   */
  reset() {
    this.processedChats.clear();
  }
}

module.exports = ChatProcessor;
