/**
 * Serviço para interagir com WhatsApp Web
 */

const config = require('./config');

class WhatsAppService {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Abre o WhatsApp Web e aguarda login
   * @param {Page} page - Página do Playwright
   * @returns {Promise<void>}
   */
  async open(page) {
    this.logger.info('Abrindo WhatsApp Web...');
    await page.goto(config.WHATSAPP_URL, { 
      timeout: config.WHATSAPP_TIMEOUT_MS 
    });

    this.logger.info('Aguardando login ou restauração de sessão...');
    await page.waitForTimeout(config.INITIAL_WAIT_MS);
    this.logger.success('WhatsApp Web carregado');
  }

  /**
   * Navega para a seção de chats arquivados
   * @param {Page} page - Página do Playwright
   * @returns {Promise<void>}
   */
  async goToArchivedChats(page) {
    this.logger.info('Acessando seção de Arquivadas...');
    await page.getByRole('button', { name: 'Arquivadas' }).click();
    this.logger.success('Seção Arquivadas aberta');
  }

  /**
   * Faz scroll inicial para carregar mais chats
   * @param {Page} page - Página do Playwright
   * @param {Function} checkStop - Função para verificar se deve parar
   * @returns {Promise<void>}
   */
  async initialScroll(page, checkStop) {
    this.logger.info('Pré-carregando lista de chats...');
    
    for (let i = 0; i < config.SCROLL_ITERATIONS; i++) {
      if (checkStop && checkStop()) {
        break;
      }
      await page.keyboard.press('PageDown');
      await page.waitForTimeout(config.SCROLL_DELAY_MS);
    }

    this.logger.success('Lista de chats carregada');
  }

  /**
   * Obtém todos os chats visíveis na tela
   * @param {Page} page - Página do Playwright
   * @returns {Promise<Array>} Array de locators de chats
   */
  async getVisibleChats(page) {
    const chatLocators = await page.getByRole('listitem').all();
    return chatLocators;
  }

  /**
   * Extrai o nome de um chat
   * @param {Locator} chatLocator - Locator do chat
   * @returns {Promise<string|null>} Nome do chat ou null
   */
  async getChatName(chatLocator) {
    try {
      const titleLocator = chatLocator.locator('span[title]').first();
      await titleLocator.waitFor({ state: 'attached', timeout: 1000 });
      return await titleLocator.getAttribute('title');
    } catch (error) {
      return null;
    }
  }

  /**
   * Clica em um chat para abri-lo
   * @param {Locator} chatLocator - Locator do chat
   * @returns {Promise<void>}
   */
  async openChat(chatLocator) {
    await chatLocator.click();
  }

  /**
   * Volta para a lista de chats
   * @param {Page} page - Página do Playwright
   * @returns {Promise<void>}
   */
  async backToChatList(page) {
    const backButton = page.getByRole('button', { name: 'Voltar' });
    const isBackVisible = await backButton.isVisible().catch(() => false);
    
    if (!isBackVisible) {
      await page.keyboard.press('Escape');
      await backButton.waitFor({ 
        state: 'visible', 
        timeout: config.BACK_BUTTON_TIMEOUT_MS 
      }).catch(() => undefined);
    }
  }

  /**
   * Faz scroll na lista de chats
   * @param {Page} page - Página do Playwright
   * @param {number} iterations - Número de scrolls
   * @param {Function} checkStop - Função para verificar se deve parar
   * @returns {Promise<void>}
   */
  async scrollChatList(page, iterations, checkStop) {
    this.logger.info(`Rolando lista de chats (${iterations}x)...`);
    
    for (let i = 0; i < iterations; i++) {
      if (checkStop && checkStop()) {
        break;
      }
      await page.keyboard.press('PageDown');
      await page.waitForTimeout(config.SCROLL_DELAY_MS);
    }
  }
}

module.exports = WhatsAppService;
