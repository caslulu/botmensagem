import type { Page } from 'playwright';
import type Logger from './utils/logger';
import { config } from './config';

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
    if (imagePath) {
      await this.attachImage(page, imagePath);
      await page.waitForTimeout(2000);
    }

    if (message) {
      await page.keyboard.insertText(message);
      await page.waitForTimeout(500);
    }
    
    await page.keyboard.press('Enter');
  }

  private async attachImage(page: Page, imagePath: string): Promise<void> {
    const attachButton = page
      .locator('button[aria-label="Anexar"], button[aria-label="Attach"], span[data-icon="plus-rounded"]')
      .first();

    await attachButton.click({ timeout: config.MESSAGE_BOX_TIMEOUT_MS });

    const photosAndVideosOption = page
      .getByText(/^Fotos e vídeos$/i)
      .or(page.getByRole('button', { name: /^Fotos e vídeos$/i }))
      .or(page.getByRole('menuitem', { name: /^Fotos e vídeos$/i }))
      .first();

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: config.MESSAGE_BOX_TIMEOUT_MS }),
      photosAndVideosOption.click({ timeout: config.MESSAGE_BOX_TIMEOUT_MS })
    ]);

    await fileChooser.setFiles(imagePath);

    try {
      await page.locator('img[src^="blob:"]').first().waitFor({
        state: 'visible',
        timeout: config.ATTACHMENT_TIMEOUT_MS
      });
    } catch {
      // best-effort preview wait
    }
  }
}

export default MessageSender;
