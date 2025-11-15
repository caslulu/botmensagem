/**
 * Gerenciador de navegador (Chrome/Chromium)
 */

const { chromium } = require('playwright');
const ChromeDetector = require('./utils/chrome-detector');
const PathResolver = require('./utils/path-resolver');
const config = require('./config');
const EventEmitter = require('events');

class BrowserManager extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger;
    this.context = null;
    this.page = null;
  }

  /**
   * Inicia o navegador com sessão persistente
   * @param {string} sessionDir - Diretório da sessão
   * @returns {Promise<{context: BrowserContext, page: Page}>}
   */
  async launch(sessionDir) {
    // Garantir que o diretório de sessão existe
    await PathResolver.ensureDir(sessionDir);

    // Detectar Chrome instalado
    const chromePath = ChromeDetector.detect();
    
    const launchOptions = {
      headless: false,
      slowMo: config.BROWSER_SLOW_MO,
      viewport: config.BROWSER_VIEWPORT
    };

    if (chromePath) {
      this.logger.info(`Usando Google Chrome: ${chromePath}`);
      launchOptions.executablePath = chromePath;
    } else {
      this.logger.warn('Chrome não encontrado. Usando Chromium do Playwright');
    }

    this.context = await chromium.launchPersistentContext(sessionDir, launchOptions);
    this.page = this.context.pages()[0] || await this.context.newPage();

    // Listeners para detectar fechamento externo
    if (this.page) {
      this.page.on('close', () => {
        this.logger.warn('Página fechada externamente - limpando referências...');
        this.page = null;
        // Notificar controlador/UI
        this.emit('closed', { source: 'page' });
      });
    }

    if (this.context) {
      this.context.on('close', () => {
        this.logger.warn('Contexto fechado externamente - limpando referências...');
        this.context = null;
        this.page = null;
        // Notificar controlador/UI
        this.emit('closed', { source: 'context' });
      });
    }

    return { context: this.context, page: this.page };
  }

  /**
   * Fecha o navegador
   * @returns {Promise<void>}
   */
  async close() {
    if (this.context) {
      try {
        await this.context.close();
        this.logger.info('Navegador fechado com sucesso');
      } catch (error) {
        this.logger.error('Erro ao fechar navegador', error);
      } finally {
        this.context = null;
        this.page = null;
        this.emit('closed', { source: 'manual' });
      }
    }
  }

  /**
   * Verifica se o navegador está aberto
   * @returns {boolean}
   */
  isOpen() {
    return this.context !== null && this.page !== null;
  }

  /**
   * Obtém a página atual
   * @returns {Page|null}
   */
  getPage() {
    return this.page;
  }

  /**
   * Obtém o contexto atual
   * @returns {BrowserContext|null}
   */
  getContext() {
    return this.context;
  }
}

module.exports = BrowserManager;
