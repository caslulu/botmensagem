import { EventEmitter } from 'events';
import ProfileValidator from './profile-validator';
import Logger from './utils/logger';
import EvolutionClient from './evolution/evolution-client';
import { config } from './config';
import type { AutomationProfile, AutomationRunResult, ValidatedAutomationProfile } from './types';
import type { EvolutionGroup } from './evolution/types';

class AutomationController extends EventEmitter {
  private isRunning = false;
  private stopRequested = false;
  private activeProfile: ValidatedAutomationProfile | null = null;
  private runPromise: Promise<void> | null = null;

  private logger: Logger;
  private evolution: EvolutionClient | null = null;

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
      this.evolution = new EvolutionClient();

      this.isRunning = true;
      this.stopRequested = false;

      this.emitStatus({
        status: `Automação de ${this.activeProfile.name} iniciada. Preparando Evolution API...`,
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

    this.emitStatus({ status: 'Encerrando automação...' });
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

  async shutdown(): Promise<void> {
    this.stopRequested = true;
    if (this.runPromise) {
      await this.runPromise.catch(() => undefined);
    }
    this.cleanup();
  }

  private async run(): Promise<void> {
    if (!this.activeProfile || !this.evolution) {
      throw new Error('Estado da automação inválido.');
    }

    const profile = this.activeProfile;
    const instanceName = profile.id;

    this.logger.info('Validando conectividade com Evolution API...');
    await this.evolution.healthcheck();
    this.checkStopRequested();

    this.logger.info(`Garantindo instância do perfil: ${instanceName}`);
    await this.evolution.ensureInstance(instanceName);
    this.checkStopRequested();

    const connectPayload = await this.evolution.connectInstance(instanceName).catch((error) => {
      this.logger.warn(`Falha ao solicitar connect da instância: ${(error as Error).message}`);
      return null;
    });

    this.logger.warn('Evolution API pronto. Faca login (QR/pairing) agora.');
    this.emitStatus({
      status: 'Evolution API pronto. Faça login (QR/pairing) agora.',
      startDisabled: true,
      stopDisabled: false,
      needsLogin: true,
      instanceName,
      connectPayload
    });

    const connected = await this.waitUntilConnected(instanceName);
    if (!connected) {
      throw new Error('Timeout aguardando login/conexao da instância Evolution API.');
    }

    this.logger.success('Instância conectada. Buscando grupos...');
    const groups = await this.fetchTargetGroups(instanceName);
    if (groups.length === 0) {
      this.logger.warn('Nenhum grupo encontrado para envio. Encerrando sem disparos.');
      this.emitStatus({
        status: `Envios finalizados para ${profile.name}. Total: 0.`,
        startDisabled: false,
        stopDisabled: true
      });
      return;
    }

    const selectedGroups = groups;
    this.logger.info(`Total de grupos arquivados elegíveis: ${selectedGroups.length}.`);

    let sent = 0;
    for (const group of selectedGroups) {
      this.checkStopRequested();
      this.logger.info(`Tentando envio para grupo: ${group.subject} (${group.id})`);

      try {
        if (profile.imagePath) {
          await this.evolution.sendImage(instanceName, group.id, profile.imagePath, profile.message);
        } else {
          await this.evolution.sendText(instanceName, group.id, profile.message);
        }
        sent += 1;
        this.logger.success(`Envio OK para ${group.subject}. Total enviado: ${sent}/${selectedGroups.length}`);
      } catch (error) {
        this.logger.error(`Falha no envio para ${group.subject}`, error as Error);
      }
    }

    this.logger.success(`Processo concluido! Total de envios com sucesso: ${sent}`);
    this.emitStatus({
      status: `Envios finalizados para ${profile.name}. Total: ${sent}.`,
      startDisabled: false,
      stopDisabled: true
    });
  }

  private async waitUntilConnected(instanceName: string): Promise<boolean> {
    const timeout = config.EVOLUTION_CONNECT_TIMEOUT_MS || 180000;
    const interval = config.EVOLUTION_POLL_INTERVAL_MS || 5000;
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeout) {
      this.checkStopRequested();
      const state = await this.evolution!.getConnectionState(instanceName);
      if (state.connected) {
        this.logger.success('Conexao confirmada pela Evolution API. Retomando envios.');
        this.emitStatus({
          status: 'Conexão confirmada. Iniciando envios...',
          startDisabled: true,
          stopDisabled: false,
          needsLogin: false,
          instanceName
        });
        return true;
      }
      this.logger.info('Aguardando login/conexao da instancia...');
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    return false;
  }

  private async fetchTargetGroups(instanceName: string): Promise<EvolutionGroup[]> {
    const groups = await this.evolution!.fetchGroups(instanceName);
    const archivedGroupIds = await this.evolution!.fetchArchivedGroupIds(instanceName);
    this.logger.info(`Grupos arquivados encontrados: ${archivedGroupIds.size}`);

    if (archivedGroupIds.size === 0) {
      throw new Error('Nenhum grupo arquivado encontrado para envio.');
    }

    const dedup = new Map<string, EvolutionGroup>();
    for (const group of groups) {
      if (archivedGroupIds.has(group.id) && !dedup.has(group.id)) {
        dedup.set(group.id, group);
      }
    }

    const filtered = Array.from(dedup.values()).sort((a, b) => a.id.localeCompare(b.id));
    if (filtered.length === 0) {
      throw new Error('Nenhum grupo arquivado elegível foi retornado pelo endpoint de grupos.');
    }

    return filtered;
  }

  private cleanup(): void {
    this.isRunning = false;
    this.stopRequested = false;
    this.activeProfile = null;
    this.runPromise = null;
    this.evolution = null;
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
