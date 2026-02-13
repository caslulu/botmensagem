import type { Page } from 'playwright';
import type Logger from './utils/logger';

class MessageSender {
  constructor(private readonly logger: Logger) {}

  async send(page: Page, message: string, imagePath: string | null): Promise<void> {
    try {
      await this._sendInternal(page, message, imagePath);
      this.logger.success('Mensagem enviada com sucesso');
    } catch (error: any) {
      this.logger.error('Erro ao enviar mensagem', error);
      throw error;
    }
  }

  private async _sendInternal(page: Page, message: string, imagePath: string | null): Promise<void> {
    await page.getByRole('button').filter({ hasText: 'plus-rounded' }).click();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('Fotos e vídeos').click();
    const fileChooser = await fileChooserPromise;
    if (imagePath) {
      await fileChooser.setFiles(imagePath);
    }

    try {
      await page.locator('img[src^="blob:"]').first().waitFor({ state: 'visible', timeout: 10000 });
    } catch {
      // best-effort preview wait
    }

    await page.waitForTimeout(2000);

    if (message) {
      await page.keyboard.insertText(message);
      await page.waitForTimeout(500);
    }
    
    await page.keyboard.press('Enter');
  }
}

export default MessageSender;
