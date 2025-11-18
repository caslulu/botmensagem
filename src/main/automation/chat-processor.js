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
      // Verificar se deve parar
      if (checkStop && checkStop()) {
        break;
      }

      // Verificar conexão e aguardar reconexão se necessário
      const connected = await this.whatsappService.isConnected(page);
      if (!connected) {
        const resumed = await this.waitUntilConnected(page, checkStop);
        if (!resumed) break;
      }

      // Obter chats visíveis
      const chatLocators = await this.whatsappService.getVisibleChats(page);
      
      if (!chatLocators.length) {
        this.logger.warn('Nenhum chat visível encontrado');
        break;
      }

      let newChatsOnScreen = 0;

      // Processar cada chat
      for (const chatLocator of chatLocators) {
        // Verificar limites
        if (checkStop && checkStop()) {
          break;
        }
        
        if (this.processedChats.size >= sendLimit) {
          break;
        }

        try {
          // Obter nome do chat
          const chatName = await this.whatsappService.getChatName(chatLocator);
          const chatIdentifier = await this.whatsappService.getChatIdentifier(chatLocator);
          const processedKey = chatIdentifier || chatName;
          if (!processedKey) {
            continue;
          }

          // Pular se já processado ou sem nome
          if (this.processedChats.has(processedKey)) {
            continue;
          }

          newChatsOnScreen++;
          
          // Processar chat
          await this.processChat(page, chatLocator, processedKey, chatName, profile);
          
          newChatsProcessed++;
          
        } catch (error) {
          this.logger.error(`Erro ao processar chat`, error);
          // Tentar voltar para a lista
          await this.whatsappService.backToChatList(page).catch(() => {});
        }
      }

      // Se não encontrou novos chats ou atingiu limite, sair
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
   * Processa um chat individual
   * @param {Page} page - Página do Playwright
   * @param {Locator} chatLocator - Locator do chat
   * @param {string} processedKey - Identificador único do chat
   * @param {string} chatName - Nome do chat
   * @param {Object} profile - Perfil ativo
   * @returns {Promise<void>}
   */
  async processChat(page, chatLocator, processedKey, chatName, profile) {
    const currentCount = this.processedChats.size + 1;
    const totalLimit = profile.sendLimit || config.DEFAULT_SEND_LIMIT;
    const displayName = chatName || processedKey || 'Chat sem nome';
    
    this.logger.info(`Processando "${displayName}" (${currentCount}/${totalLimit})`);

    await page.bringToFront();

    // Verificar conexão antes de abrir/enviar
    const connected = await this.whatsappService.isConnected(page);
    if (!connected) {
      const resumed = await this.waitUntilConnected(page, null);
      if (!resumed) {
        this.logger.warn(`Sem conexão. Pulando "${displayName}" por enquanto.`);
        return;
      }
    }

    // Abrir chat
    await this.whatsappService.openChat(chatLocator);

    const blocked = await this.whatsappService.isChatBlocked(page);
    if (blocked) {
      this.logger.warn(`Chat bloqueado. Pulando: ${displayName}`);
      this.processedChats.add(processedKey);
      await this.whatsappService.backToChatList(page);
      return;
    }

    const ok = await this.messageSender.sendWithConfirmation(page, profile.message, profile.imagePath);
    if (!ok) {
      this.logger.warn(`Envio sem confirmação. Pulando: ${displayName}`);
      this.processedChats.add(processedKey);
      await this.whatsappService.backToChatList(page);
      return;
    }

    // Marcar como processado
    this.processedChats.add(processedKey);

    // Aguardar delay
    await this.messageSender.waitDelay(page);

    // Voltar para lista
    await this.whatsappService.backToChatList(page);

    // Scroll periódico
    if (this.processedChats.size > 0 && this.processedChats.size % config.SCROLL_AFTER_SENDS === 0) {
      await this.whatsappService.scrollChatList(page, config.SCROLL_DISTANCE, null);
    }
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
