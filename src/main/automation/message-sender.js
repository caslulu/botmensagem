const config = require('./config');

class MessageSender {
  constructor(logger) {
    this.logger = logger;
  }

  async send(page, message, imagePath) {
    try {
      await this._sendInternal(page, message, imagePath);
      this.logger.success('Mensagem enviada com sucesso');
    } catch (error) {
      this.logger.error('Erro ao enviar mensagem', error);
      throw error;
    }
  }

  async _sendInternal(page, message, imagePath) {
    await page.getByRole('button').filter({ hasText: 'plus-rounded' }).click();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Fotos e vídeos' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(imagePath);

    try {
      await page.locator('img[src^="blob:"]').first().waitFor({ state: 'visible', timeout: 10000 });
    } catch (e) {
    }

    await page.waitForTimeout(2000);

    if (message) {
      await page.keyboard.insertText(message);
      await page.waitForTimeout(500);
    }
    
    await page.keyboard.press('Enter');
  }


}

module.exports = MessageSender;
