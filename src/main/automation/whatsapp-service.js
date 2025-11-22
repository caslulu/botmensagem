/**
 * Serviço para interagir com WhatsApp Web
 */

const config = require('./config');

class WhatsAppService {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Verifica se o WhatsApp Web está conectado/logado e operante
   * @param {Page} page
   * @returns {Promise<boolean>}
   */
  async isConnected(page) {
    try {
      const hasChatList = await page
        .locator('[data-testid="chat-list"], div[role="grid"]')
        .first()
        .isVisible()
        .catch(() => false);

      const hasQr = await page
        .locator('[data-testid="qrcode"], canvas[aria-label*="Scan" i], canvas[aria-label*="Escaneie" i], [data-ref]')
        .first()
        .isVisible()
        .catch(() => false);

      const reconnecting = await page
        .locator('text=/Conectando|Tentando reconectar|Reconnecting|Phone (is|not) connected/i')
        .first()
        .isVisible()
        .catch(() => false);

      return Boolean(hasChatList) && !hasQr && !reconnecting;
    } catch (_) {
      return false;
    }
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

  async waitUntilReady(page, checkStop) {
    const timeout = config.WHATSAPP_READY_TIMEOUT_MS || 60000;
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
      if (checkStop && checkStop()) {
        throw new Error('Execução interrompida durante preparação do WhatsApp.');
      }

      if (await this.isConnected(page)) {
        this.logger.success('WhatsApp Web pronto para enviar.');
        return true;
      }

      await page.waitForTimeout(1000);
    }

    throw new Error('WhatsApp Web não ficou pronto a tempo. Verifique a conexão.');
  }

  /**
   * Navega para a seção de chats arquivados
   * @param {Page} page - Página do Playwright
   * @returns {Promise<void>}
   */
  async goToArchivedChats(page) {
    this.logger.info('Acessando seção de Arquivadas...');
    
    // Check if already there (Back button or Header Title)
    const isBackVisible = await page.locator('span[data-icon="back"], [aria-label="Voltar"], [aria-label="Back"]').first().isVisible().catch(() => false);
    const isTitleVisible = await page.locator('header').getByText(/Arquivadas|Archived/i).first().isVisible().catch(() => false);
    
    if (isBackVisible || isTitleVisible) {
        this.logger.info('Já estamos na seção Arquivadas.');
        return;
    }

    // Simple approach as requested
    try {
      // Try by text first (as in the example)
      const archivedButton = page.getByRole('button', { name: 'Arquivadas' }).or(page.getByRole('button', { name: 'Archived' }));
      if (await archivedButton.isVisible()) {
        await archivedButton.click();
      } else {
        // Fallback to icon if text fails
        await page.locator('span[data-icon="archived"]').click();
      }
      
      this.logger.success('Seção Arquivadas aberta');
      await page.waitForTimeout(2000);
    } catch (error) {
      this.logger.error('Erro ao acessar Arquivadas', error);
      throw error;
    }
  }

  /**
   * Faz scroll inicial para carregar mais chats
   * @param {Page} page - Página do Playwright
   * @param {Function} checkStop - Função para verificar se deve parar
   * @returns {Promise<void>}
   */
  async initialScroll(page, checkStop) {
    this.logger.info('Pré-carregando lista de chats...');
    
    // Scroll 30 times as in the example
    for (let i = 0; i < 30; i++) {
      if (checkStop && checkStop()) break;
      await page.keyboard.press('PageDown');
      await page.waitForTimeout(500);
    }

    this.logger.success('Lista de chats carregada');
  }

  /**
   * Obtém todos os chats visíveis na tela
   * @param {Page} page - Página do Playwright
   * @returns {Promise<Array>} Array de locators de chats
   */
  async getVisibleChats(page) {
    const list = page.locator('[data-testid="chat-list"], div[role="grid"]').first();
    // Get all rows but filter out the "Archived" button if it appears as a row (just in case)
    const rows = await list.locator('div[role="row"], [role="listitem"]').all();
    
    // Optional: Filter out rows that are likely not chats (e.g. headers)
    // This is tricky because Playwright locators are lazy, but we can do it in the loop in chat-processor
    return rows;
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

  async getChatIdentifier(chatLocator) {
    try {
      const identifier = await chatLocator.evaluate((node) => {
        const directId = node.dataset?.id || node.getAttribute('data-id');
        if (directId) return directId;

        const rowId = node.getAttribute('data-row-id') || node.getAttribute('data-rowindex');
        if (rowId) return `row:${rowId}`;

        const aria = node.getAttribute('aria-label');
        if (aria) return aria;

        const nestedWithId = node.querySelector('[data-id]');
        if (nestedWithId) {
          return nestedWithId.getAttribute('data-id');
        }

        const text = node.textContent || '';
        return text.slice(0, 80);
      });

      return (identifier || '').trim() || null;
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
    // Simple and robust click
    await chatLocator.scrollIntoViewIfNeeded();
    // Force click helps with overlays
    await chatLocator.click({ force: true });
    
    // Wait for conversation panel to appear
    // This confirms the chat was actually opened
    try {
      const panel = chatLocator.page().locator('[data-testid="conversation-panel"], main[role="main"]').first();
      await panel.waitFor({ state: 'visible', timeout: 10000 });
    } catch (e) {
      // If panel didn't open, maybe click failed? Retry once
      await chatLocator.click({ force: true });
      const panel = chatLocator.page().locator('[data-testid="conversation-panel"], main[role="main"]').first();
      await panel.waitFor({ state: 'visible', timeout: 10000 });
    }
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
    
    await page.bringToFront();
    
    for (let i = 0; i < iterations; i++) {
      if (checkStop && checkStop()) {
        break;
      }
      const prev = await this.getLastVisibleChatTitle(page);
      await page.keyboard.press('PageDown');
      await page.waitForTimeout(config.SCROLL_DELAY_MS);
      await this.waitForChatListSettled(page, prev, config.CHAT_LIST_SETTLE_TIMEOUT_MS).catch(() => {});
    }
  }

  async getLastVisibleChatTitle(page) {
    try {
      const list = page.locator('[data-testid="chat-list"], div[role="grid"]').first();
      const titles = await list.locator('span[title]').all();
      if (!titles.length) return null;
      const last = titles[titles.length - 1];
      return await last.getAttribute('title');
    } catch (_) {
      return null;
    }
  }

  async waitForChatListSettled(page, previousLastTitle, timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < (timeoutMs || 4000)) {
      const current = await this.getLastVisibleChatTitle(page);
      if (current && current !== previousLastTitle) {
        await page.waitForAnimation?.().catch(() => {});
        await page.waitForTimeout(50);
        return;
      }
      await page.waitForTimeout(100);
    }
  }

  async isChatBlocked(page) {
    try {
      const panel = page.locator('[data-testid="conversation-panel"], main[role="main"]').first();
      const composer = panel.locator('[data-testid="conversation-composer"], div[contenteditable="true"]').first();
      const composerVisible = await composer.isVisible().catch(() => false);
      let composerEditable = false;
      if (composerVisible) {
        try {
          const attr = await composer.getAttribute('contenteditable');
          composerEditable = attr === null || attr === 'true';
        } catch { composerEditable = true; }
      }

      const blockedBanner = await panel.locator('text=/não pode enviar mensagens|Only admins can send messages|You can\’t send messages|You can\'t send messages/i').first().isVisible().catch(() => false);
      const composerDisabled = composerVisible && !composerEditable;
      return Boolean(blockedBanner || composerDisabled);
    } catch (_) {
      return false;
    }
  }
}

module.exports = WhatsAppService;
