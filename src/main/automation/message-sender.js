/**
 * Responsável por enviar mensagens no WhatsApp
 */

const config = require('./config');

class MessageSender {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Envia uma mensagem com imagem
   * @param {Page} page - Página do Playwright
   * @param {string} message - Texto da mensagem
   * @param {string} imagePath - Caminho da imagem
   * @returns {Promise<void>}
   */
  async send(page, message, imagePath) {
    try {
      await this._sendInternal(page, message, imagePath);
      this.logger.success('Mensagem enviada com sucesso');
    } catch (error) {
      this.logger.error('Erro ao enviar mensagem', error);
      throw error;
    }
  }

  async sendWithConfirmation(page, message, imagePath) {
    try {
      const prevCount = await this.getOutgoingMessageCount(page);
      await this._sendInternal(page, message, imagePath);
      const ok = await this.waitForSendConfirmation(page, message, prevCount, config.SEND_CONFIRM_TIMEOUT_MS);
      if (ok) return true;
      for (let i = 0; i < (config.SEND_RETRY_MAX || 0); i++) {
        await page.waitForTimeout(config.SEND_RETRY_DELAY_MS || 1000);
        await this._sendInternal(page, message, imagePath);
        const again = await this.waitForSendConfirmation(page, message, prevCount, config.SEND_CONFIRM_TIMEOUT_MS);
        if (again) return true;
      }
      return false;
    } catch (error) {
      this.logger.error('Erro ao enviar mensagem com confirmação', error);
      return false;
    }
  }

  async _sendInternal(page, message, imagePath) {
    // 1. Clicar no botão de anexo (Clip/Mais) usando o seletor fornecido
    await page.getByRole('button').filter({ hasText: 'plus-rounded' }).click();

    // 2. Clicar em "Fotos e vídeos" e tratar o upload via FileChooser
    // Como clicar no botão abre a janela do sistema, precisamos esperar o evento de filechooser
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Fotos e vídeos' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(imagePath);

    // Pequena pausa para garantir que a interface reaja ao arquivo e abra o modal
    await page.waitForTimeout(500);

    // 3. Preencher a legenda (o campo já vem focado, segundo observação)
    if (message) {
      // Cola o texto de uma vez para evitar quebras de linha acionando o envio
      await page.keyboard.insertText(message);
    }
    
    // 4. Enviar (Enter)
    await page.keyboard.press('Enter');
  }

  async waitForSendConfirmation(page, message, prevCount, timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < (timeoutMs || 15000)) {
      const count = await this.getOutgoingMessageCount(page);
      if (count > prevCount) return true;
      const lastText = await this.getLastOutgoingMessageText(page);
      if (lastText && this._normalizeText(lastText).includes(this._normalizeText(message))) {
        return true;
      }
      await page.waitForTimeout(200);
    }
    return false;
  }

  _normalizeText(t) {
    return String(t || '').replace(/\s+/g, ' ').trim();
  }

  async getOutgoingMessageCount(page) {
    const panel = page.locator('[data-testid="conversation-panel"], main[role="main"]').first();
    const bubbles = await panel.locator('[data-testid="msg-container"], [data-testid^="message-"], div[role="row"]').all();
    let count = 0;
    for (const b of bubbles) {
      const aria = (await b.getAttribute('aria-label')) || '';
      const classes = (await b.getAttribute('class')) || '';
      if (/sent|outgoing/i.test(aria) || /message-out|to-right|right/i.test(classes)) count++;
    }
    return count;
  }

  async getLastOutgoingMessageText(page) {
    const panel = page.locator('[data-testid="conversation-panel"], main[role="main"]').first();
    const bubbles = await panel.locator('[data-testid="msg-container"], [data-testid^="message-"], div[role="row"]').all();
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      const aria = (await b.getAttribute('aria-label')) || '';
      const classes = (await b.getAttribute('class')) || '';
      const outgoing = /sent|outgoing/i.test(aria) || /message-out|to-right|right/i.test(classes);
      if (!outgoing) continue;
      const text = await b.locator('[data-testid="msg-text"], span.selectable-text, div.copyable-text').allTextContents().catch(() => []);
      const joined = Array.isArray(text) ? text.join(' ').trim() : '';
      if (joined) return joined;
    }
    return '';
  }

  /**
   * Aguarda o intervalo entre mensagens
   * @param {Page} page - Página do Playwright
   * @returns {Promise<void>}
   */
  async waitDelay(page) {
    this.logger.log(`Aguardando ${config.MESSAGE_DELAY_MS}ms antes da próxima mensagem...`);
    await page.waitForTimeout(config.MESSAGE_DELAY_MS);
  }
}

module.exports = MessageSender;
