import type { Page } from 'playwright';
import { config } from './config';
import type Logger from './utils/logger';

class WhatsAppService {
  constructor(private readonly logger: Logger) {}

  async isConnected(page: Page): Promise<boolean> {
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

  async open(page: Page): Promise<void> {
    this.logger.info('Abrindo WhatsApp Web...');
    await page.goto(config.WHATSAPP_URL, {
      timeout: config.WHATSAPP_TIMEOUT_MS
    });

    this.logger.info('Aguardando login ou restauração de sessão...');
    await page.waitForTimeout(config.INITIAL_WAIT_MS);
    this.logger.success('WhatsApp Web carregado');
  }

  async waitUntilReady(page: Page, checkStop?: () => boolean): Promise<boolean> {
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

  async goToArchivedChats(page: Page): Promise<void> {
    this.logger.info('Acessando seção de Arquivadas...');

    const isBackVisible = await page
      .locator('span[data-icon="back"], [aria-label="Voltar"], [aria-label="Back"]')
      .first()
      .isVisible()
      .catch(() => false);
    const isTitleVisible = await page
      .locator('header')
      .getByText(/Arquivadas|Archived/i)
      .first()
      .isVisible()
      .catch(() => false);

    if (isBackVisible || isTitleVisible) {
      this.logger.info('Já estamos na seção Arquivadas.');
      return;
    }

    try {
      const archivedButton = page
        .getByRole('button', { name: 'Arquivadas' })
        .or(page.getByRole('button', { name: 'Archived' }));
      if (await archivedButton.isVisible()) {
        await archivedButton.click();
      } else {
        await page.locator('span[data-icon="archived"]').click();
      }

      this.logger.success('Seção Arquivadas aberta');
      await page.waitForTimeout(2000);
    } catch (error: any) {
      this.logger.error('Erro ao acessar Arquivadas', error);
      throw error;
    }
  }

  async initialScroll(page: Page, checkStop?: () => boolean): Promise<void> {
    this.logger.info('Pré-carregando lista de chats...');

    for (let i = 0; i < 30; i++) {
      if (checkStop && checkStop()) break;
      await page.keyboard.press('PageDown');
      await page.waitForTimeout(500);
    }

    this.logger.success('Lista de chats carregada');
  }
}

export default WhatsAppService;
