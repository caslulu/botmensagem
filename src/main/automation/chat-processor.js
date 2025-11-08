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

          // Pular se já processado ou sem nome
          if (!chatName || this.processedChats.has(chatName)) {
            continue;
          }

          newChatsOnScreen++;
          
          // Processar chat
          await this.processChat(page, chatLocator, chatName, profile);
          
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
   * @param {string} chatName - Nome do chat
   * @param {Object} profile - Perfil ativo
   * @returns {Promise<void>}
   */
  async processChat(page, chatLocator, chatName, profile) {
    const currentCount = this.processedChats.size + 1;
    const totalLimit = profile.sendLimit || config.DEFAULT_SEND_LIMIT;
    
    this.logger.info(`Processando "${chatName}" (${currentCount}/${totalLimit})`);

    // Abrir chat
    await this.whatsappService.openChat(chatLocator);

    // Enviar mensagem
    await this.messageSender.send(page, profile.message, profile.imagePath);

    // Marcar como processado
    this.processedChats.add(chatName);

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
