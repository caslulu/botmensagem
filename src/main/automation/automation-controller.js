const EventEmitter = require('events');
const BrowserManager = require('./browser-manager');
const WhatsAppService = require('./whatsapp-service');
const MessageSender = require('./message-sender');
const ChatProcessor = require('./chat-processor');
const ProfileValidator = require('./profile-validator');
const Logger = require('./utils/logger');

class AutomationController extends EventEmitter {
  constructor() {
    super();
    
    this.isRunning = false;
    this.stopRequested = false;
    this.activeProfile = null;
    this.runPromise = null;

    this.logger = new Logger(this);
    this.browserManager = null;
    this.whatsappService = null;
    this.messageSender = null;
    this.chatProcessor = null;
  }

  async start(profile) {
    if (this.isRunning) {
      throw new Error('Automação já está em execução.');
    }

    try {
      this.activeProfile = ProfileValidator.validate(profile);
      this.logger.setProfile(this.activeProfile);

      this.initializeModules();

      this.isRunning = true;
      this.stopRequested = false;

      this.emitStatus({
        status: `Automação de ${this.activeProfile.name} iniciada. Preparando ambiente…`,
        startDisabled: true,
        stopDisabled: false
      });

      this.runPromise = this.run()
        .catch((error) => {
          this.logger.error('Erro crítico na automação', error);
          this.emitStatus({
            status: 'Automação falhou. Consulte os logs.',
            startDisabled: false,
            stopDisabled: true
          });
        })
        .finally(() => {
          this.cleanup();
        });

      return { message: `Automação de ${this.activeProfile.name} iniciada.` };
      
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      return { message: 'Automação já está parada.', status: 'idle' };
    }

    const profileName = this.activeProfile?.name ?? 'perfil';
    this.stopRequested = true;
    
    this.emitStatus({ status: 'Encerrando automação…' });
    this.logger.warn('Parando automação...');

    if (this.runPromise) {
      await this.runPromise;
    }

    this.emitStatus({
      status: `Automação de ${profileName} parada.`,
      startDisabled: false,
      stopDisabled: true
    });

    return { 
      message: `Automação de ${profileName} interrompida.`, 
      status: 'idle' 
    };
  }

  async run() {
    try {
      this.logger.info('Iniciando processo de automação...');

      this.logger.info(`Abrindo navegador com sessão: ${this.activeProfile.sessionDir}`);
      const { page } = await this.browserManager.launch(this.activeProfile.sessionDir);

      await this.whatsappService.open(page);
      await this.whatsappService.waitUntilReady(page, () => this.stopRequested);
      this.checkStopRequested();

      await this.whatsappService.goToArchivedChats(page);
      this.checkStopRequested();

      await this.whatsappService.initialScroll(page, () => this.stopRequested);
      this.checkStopRequested();

      const totalProcessed = await this.chatProcessor.processMultipleIterations(
        page,
        this.activeProfile,
        () => this.stopRequested
      );

      this.logger.success(`Processo concluído! Total de envios: ${totalProcessed}`);
      this.emitStatus({
        status: `Envios finalizados para ${this.activeProfile.name}. Total: ${totalProcessed}.`,
        startDisabled: false,
        stopDisabled: true
      });

    } catch (error) {
      if (this.stopRequested) {
        this.logger.warn('Automação interrompida pelo usuário');
      } else {
        this.logger.error('Erro durante automação', error);
        throw error;
      }
    } finally {
      this.logger.info('Automação finalizada. O navegador permanecerá aberto.');
    }
  }

  initializeModules() {
    this.browserManager = new BrowserManager(this.logger);
    this.whatsappService = new WhatsAppService(this.logger);
    this.messageSender = new MessageSender(this.logger);
    this.chatProcessor = new ChatProcessor(
      this.logger,
      this.whatsappService,
      this.messageSender
    );

    if (this.browserManager && typeof this.browserManager.on === 'function') {
      this.browserManager.on('closed', (evt) => {
        const source = evt && evt.source ? evt.source : 'unknown';
        this.logger.warn(`Navegador fechado (${source}). Atualizando estado para parado.`);
        this.isRunning = false;
        this.stopRequested = false;
        this.emitStatus({
          status: 'Automação parada (navegador fechado).',
          startDisabled: false,
          stopDisabled: true
        });
      });
    }
  }

  cleanup() {
    this.isRunning = false;
    this.stopRequested = false;
    this.activeProfile = null;
    this.runPromise = null;
    
    if (this.chatProcessor) {
      this.chatProcessor.reset();
    }
  }

  checkStopRequested() {
    if (this.stopRequested) {
      throw new Error('Execução interrompida pelo usuário.');
    }
  }

  log(message) {
    const prefix = this.activeProfile ? `[${this.activeProfile.name}] ` : '';
    this.emit('log', `${prefix}${message}`);
  }

  emitStatus(payload) {
    if (this.activeProfile) {
      payload.profileId = this.activeProfile.id;
      payload.profileName = this.activeProfile.name;
    }
    this.emit('status', payload);
  }
}

module.exports = new AutomationController();
