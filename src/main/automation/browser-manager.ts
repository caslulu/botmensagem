import { chromium, type BrowserContext, type Page } from 'playwright';
import ChromeDetector from './utils/chrome-detector';
import PathResolver from './utils/path-resolver';
import { config } from './config';
import { EventEmitter } from 'events';
import type Logger from './utils/logger';

class BrowserManager extends EventEmitter {
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  constructor(private readonly logger: Logger) {
    super();
  }

  async launch(sessionDir: string): Promise<{ context: BrowserContext; page: Page }> {
    await PathResolver.ensureDir(sessionDir);

    const chromePath = ChromeDetector.detect();
    
    const launchOptions: Parameters<typeof chromium.launchPersistentContext>[1] = {
      headless: false,
      slowMo: config.BROWSER_SLOW_MO,
      viewport: config.BROWSER_VIEWPORT,
      args: [
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    };

    if (chromePath) {
      this.logger.info(`Usando Google Chrome: ${chromePath}`);
      launchOptions.executablePath = chromePath;
    } else {
      this.logger.warn('Chrome não encontrado. Usando Chromium do Playwright');
    }

    this.context = await chromium.launchPersistentContext(sessionDir, launchOptions);
    this.page = this.context.pages()[0] || await this.context.newPage();
    
    await this.page.bringToFront();

    if (this.page) {
      this.page.on('close', () => {
        this.logger.warn('Página fechada externamente - limpando referências...');
        this.page = null;
        this.emit('closed', { source: 'page' });
      });
    }

    if (this.context) {
      this.context.on('close', () => {
        this.logger.warn('Contexto fechado externamente - limpando referências...');
        this.context = null;
        this.page = null;
        this.emit('closed', { source: 'context' });
      });
    }

    if (!this.context || !this.page) {
      throw new Error('Contexto ou página não inicializados.');
    }

    return { context: this.context, page: this.page };
  }

  async close(): Promise<void> {
    if (this.context) {
      try {
        await this.context.close();
        this.logger.info('Navegador fechado com sucesso');
      } catch (error: any) {
        this.logger.error('Erro ao fechar navegador', error);
      } finally {
        this.context = null;
        this.page = null;
        this.emit('closed', { source: 'manual' });
      }
    }
  }

}

export default BrowserManager;
