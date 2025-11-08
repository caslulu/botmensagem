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
      // Abrir menu de anexos
      const attachButton = page.getByRole('button', { name: 'Anexar' });
      await attachButton.click();

      // Selecionar fotos e vídeos
      const photosButton = page.getByRole('button', { name: 'Fotos e vídeos' });
      await photosButton.waitFor({ 
        state: 'visible', 
        timeout: config.ATTACHMENT_TIMEOUT_MS 
      });

      // Fazer upload da imagem
      await photosButton.locator('input[type="file"]').setInputFiles(imagePath);

      // Aguardar caixa de mensagem aparecer
      const messageBox = page.getByRole('textbox', { name: 'Digite uma mensagem' });
      await messageBox.waitFor({ 
        state: 'visible', 
        timeout: config.MESSAGE_BOX_TIMEOUT_MS 
      });

      // Preencher e enviar mensagem
      await messageBox.fill(message);
      await messageBox.press('Enter');

      this.logger.success('Mensagem enviada com sucesso');
    } catch (error) {
      this.logger.error('Erro ao enviar mensagem', error);
      throw error;
    }
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
