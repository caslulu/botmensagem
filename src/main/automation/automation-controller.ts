import { EventEmitter } from 'events';
import BrowserManager from './browser-manager';
import WhatsAppService from './whatsapp-service';
import MessageSender from './message-sender';
import ChatProcessor from './chat-processor';
import ProfileValidator from './profile-validator';
import Logger from './utils/logger';
import type { AutomationProfile, AutomationRunResult, ValidatedAutomationProfile } from './types';

class AutomationController extends EventEmitter {
  private isRunning = false;
  private stopRequested = false;
  private activeProfile: ValidatedAutomationProfile | null = null;
  private runPromise: Promise<void> | null = null;

  private logger: Logger;
  private browserManager: BrowserManager | null = null;
  private whatsappService: WhatsAppService | null = null;
  private messageSender: MessageSender | null = null;
  private chatProcessor: ChatProcessor | null = null;

  constructor() {
    super();
    this.logger = new Logger(this);
  }

  async start(profile: AutomationProfile): Promise<AutomationRunResult> {
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
          this.logger.error('Erro crítico na automação', error as Error);
          this.emitStatus({
            status: 'Automação falhou. Consulte os logs.',
            startDisabled: false,
            stopDisabled: true
          });
        })
        .finally(() => {
          this.cleanup();
        });

      return { message: `Automação de ${this.activeProfile.name} iniciada.`, status: 'running' };
      
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  async stop(): Promise<AutomationRunResult> {
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

  private async run(): Promise<void> {
    try {
      this.logger.info('Iniciando processo de automação...');

      if (!this.activeProfile || !this.browserManager || !this.whatsappService || !this.chatProcessor) {
        throw new Error('Estado da automação inválido.');
      }

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
        this.logger.error('Erro durante automação', error as Error);
        throw error;
      }
    } finally {
      this.logger.info('Automação finalizada. O navegador permanecerá aberto.');
    }
  }

  private initializeModules(): void {
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
        const source = evt && (evt as any).source ? (evt as any).source : 'unknown';
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

  private cleanup(): void {
    this.isRunning = false;
    this.stopRequested = false;
    this.activeProfile = null;
    this.runPromise = null;
    
    if (this.chatProcessor) {
      this.chatProcessor.reset();
    }
  }

  private checkStopRequested(): void {
    if (this.stopRequested) {
      throw new Error('Execução interrompida pelo usuário.');
    }
  }

  log(message: string): void {
    const prefix = this.activeProfile ? `[${this.activeProfile.name}] ` : '';
    this.emit('log', `${prefix}${message}`);
  }

  private emitStatus(payload: Record<string, unknown> & { status: string; startDisabled?: boolean; stopDisabled?: boolean }): void {
    if (this.activeProfile) {
      payload.profileId = this.activeProfile.id;
      payload.profileName = this.activeProfile.name;
    }
    this.emit('status', payload);
  }
}

const automationController = new AutomationController();

export default automationController;
