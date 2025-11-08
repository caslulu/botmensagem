/**
 * Controlador principal da automação
 * Orquestra todos os módulos de automação
 */

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
    
    // Estado
    this.isRunning = false;
    this.stopRequested = false;
    this.activeProfile = null;
    this.runPromise = null;

    // Módulos (serão inicializados quando necessário)
    this.logger = new Logger(this);
    this.browserManager = null;
    this.whatsappService = null;
    this.messageSender = null;
    this.chatProcessor = null;
  }

  /**
   * Inicia a automação para um perfil
   * @param {Object} profile - Perfil a ser processado
   * @returns {Promise<Object>} Resultado da inicialização
   */
  async start(profile) {
    // Validar estado
    if (this.isRunning) {
      throw new Error('Automação já está em execução.');
    }

    try {
      // Quando perfil vem do banco já possui sessionDir e imagePath resolvidos.
      // Ainda assim aplicamos validação (garante mensagem e imagem).
      this.activeProfile = ProfileValidator.validate(profile);
      this.logger.setProfile(this.activeProfile);

      // Inicializar módulos
      this.initializeModules();

      // Atualizar estado
      this.isRunning = true;
      this.stopRequested = false;

      // Emitir status inicial
      this.emitStatus({
        status: `Automação de ${this.activeProfile.name} iniciada. Preparando ambiente…`,
        startDisabled: true,
        stopDisabled: false
      });

      // Executar automação em background
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

  /**
   * Para a automação em execução
   * @returns {Promise<Object>} Resultado da parada
   */
  async stop() {
    if (!this.isRunning) {
      return { message: 'Automação já está parada.', status: 'idle' };
    }

    const profileName = this.activeProfile?.name ?? 'perfil';
    this.stopRequested = true;
    
    this.emitStatus({ status: 'Encerrando automação…' });
    this.logger.warn('Parando automação...');

    // Fechar navegador
    if (this.browserManager) {
      await this.browserManager.close();
    }

    // Aguardar conclusão
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

  /**
   * Executa o fluxo completo da automação
   * @private
   * @returns {Promise<void>}
   */
  async run() {
    try {
      this.logger.info('Iniciando processo de automação...');

      // 1. Abrir navegador
      this.logger.info(`Abrindo navegador com sessão: ${this.activeProfile.sessionDir}`);
      const { page } = await this.browserManager.launch(this.activeProfile.sessionDir);

      // 2. Abrir WhatsApp Web
      await this.whatsappService.open(page);
      this.checkStopRequested();

      // 3. Navegar para arquivados
      await this.whatsappService.goToArchivedChats(page);
      this.checkStopRequested();

      // 4. Scroll inicial
      await this.whatsappService.initialScroll(page, () => this.stopRequested);
      this.checkStopRequested();

      // 5. Processar chats em múltiplas iterações
      const totalProcessed = await this.chatProcessor.processMultipleIterations(
        page,
        this.activeProfile,
        () => this.stopRequested
      );

      // 6. Finalizar
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
      // Fechar navegador
      if (this.browserManager) {
        await this.browserManager.close();
      }
    }
  }

  /**
   * Inicializa os módulos de automação
   * @private
   */
  initializeModules() {
    this.browserManager = new BrowserManager(this.logger);
    this.whatsappService = new WhatsAppService(this.logger);
    this.messageSender = new MessageSender(this.logger);
    this.chatProcessor = new ChatProcessor(
      this.logger,
      this.whatsappService,
      this.messageSender
    );
  }

  /**
   * Limpa recursos após execução
   * @private
   */
  cleanup() {
    this.isRunning = false;
    this.stopRequested = false;
    this.activeProfile = null;
    this.runPromise = null;
    
    // Resetar módulos
    if (this.chatProcessor) {
      this.chatProcessor.reset();
    }
  }

  /**
   * Verifica se foi solicitada a parada
   * @private
   * @throws {Error} Se parada foi solicitada
   */
  checkStopRequested() {
    if (this.stopRequested) {
      throw new Error('Execução interrompida pelo usuário.');
    }
  }

  /**
   * Emite um evento de log
   * @private
   * @param {string} message - Mensagem de log
   */
  log(message) {
    const prefix = this.activeProfile ? `[${this.activeProfile.name}] ` : '';
    this.emit('log', `${prefix}${message}`);
  }

  /**
   * Emite um evento de status
   * @private
   * @param {Object} payload - Dados do status
   */
  emitStatus(payload) {
    if (this.activeProfile) {
      payload.profileId = this.activeProfile.id;
      payload.profileName = this.activeProfile.name;
    }
    this.emit('status', payload);
  }
}

module.exports = new AutomationController();
