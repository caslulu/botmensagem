const { chromium } = require('playwright');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

const MESSAGE_DELAY_MS = 2000;
const SEND_LIMIT = 200;
const LOOP_QUANTITY = 10;

class AutomationController extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.stopRequested = false;
    this.context = null;
    this.runPromise = null;
    this.activeProfile = null;
  }

  async start(profile) {
    if (this.isRunning) {
      throw new Error('Automação já está em execução.');
    }

    if (!profile || !profile.id) {
      throw new Error('Perfil inválido informado para automação.');
    }

    const resolvedImagePath = path.isAbsolute(profile.imagePath)
      ? profile.imagePath
      : path.join(process.cwd(), profile.imagePath);

    if (!fs.existsSync(resolvedImagePath)) {
      throw new Error(`Imagem do perfil ${profile.name} não encontrada em ${resolvedImagePath}`);
    }

    const trimmedMessage = (profile.message ?? '').toString().trim();
    if (!trimmedMessage) {
      throw new Error(`Mensagem do perfil ${profile.name} não pode ser vazia.`);
    }

    const resolvedSessionDir = path.isAbsolute(profile.sessionDir)
      ? profile.sessionDir
      : path.join(process.cwd(), profile.sessionDir);

    this.activeProfile = {
      ...profile,
      imagePath: resolvedImagePath,
      message: trimmedMessage,
      sessionDir: resolvedSessionDir
    };

    this.isRunning = true;
    this.stopRequested = false;
    this.emitStatus({
      status: `Automação de ${this.activeProfile.name} iniciada. Preparando ambiente…`,
      startDisabled: true,
      stopDisabled: false
    });

    this.runPromise = this.run().catch((error) => {
      this.log(`Erro crítico: ${error.message}`);
      this.emitStatus({
        status: 'Automação falhou. Consulte os logs.',
        startDisabled: false,
        stopDisabled: true
      });
    }).finally(() => {
      this.isRunning = false;
      this.runPromise = null;
      this.stopRequested = false;
      this.activeProfile = null;
    });

    return { message: `Automação de ${this.activeProfile.name} iniciada.` };
  }

  async stop() {
    if (!this.isRunning) {
      return { message: 'Automação já está parada.', status: 'idle' };
    }

    this.stopRequested = true;
    this.emitStatus({ status: 'Encerrando automação…' });

    try {
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
    } catch (error) {
      this.log(`Erro ao fechar contexto: ${error.message}`);
    }

    if (this.runPromise) {
      await this.runPromise;
    }

    const profileName = this.activeProfile?.name ?? 'perfil';

    this.isRunning = false;
    this.emitStatus({
      status: `Automação de ${profileName} parada.`,
      startDisabled: false,
      stopDisabled: true
    });

    this.activeProfile = null;

    return { message: `Automação de ${profileName} interrompida.`, status: 'idle' };
  }

  async run() {
    try {
      const profile = this.activeProfile;
      if (!profile) {
        throw new Error('Nenhum perfil ativo encontrado ao iniciar a automação.');
      }

      await fs.promises.mkdir(profile.sessionDir, { recursive: true });
      this.context = await chromium.launchPersistentContext(profile.sessionDir, {
        headless: false,
        slowMo: 50,
        viewport: { width: 1280, height: 800 }
      });

      const page = this.context.pages()[0] ?? await this.context.newPage();
      this.log(`Abrindo o WhatsApp Web para ${profile.name}…`);
      await page.goto('https://web.whatsapp.com', { timeout: 90_000 });
      this.log('Login realizado ou sessão restaurada. Aguardando carregamento…');
      await page.waitForTimeout(30_000);

      await this.ensureRunning();

      this.log('Acessando seção de Arquivadas…');
      await page.getByRole('button', { name: 'Arquivadas' }).click();
      this.log('Seção Arquivadas aberta. Pré-posicionando lista…');

      for (let i = 0; i < 30 && !this.stopRequested; i += 1) {
        await page.keyboard.press('PageDown');
        await page.waitForTimeout(500);
      }

      const processedChats = new Set();

      for (let iteration = 1; iteration <= LOOP_QUANTITY; iteration += 1) {
        await this.ensureRunning();

        if (processedChats.size >= SEND_LIMIT) {
          this.log(`Limite de ${SEND_LIMIT} envios atingido. Encerrando.`);
          break;
        }

        this.log(`Iniciando iteração ${iteration}/${LOOP_QUANTITY} — Chats enviados: ${processedChats.size}`);
        await this.processVisibleChats(page, processedChats);

        if (processedChats.size >= SEND_LIMIT) {
          break;
        }

        await page.waitForTimeout(5_000);
      }

      this.log('Processo concluído.');
      this.emitStatus({
        status: `Envios finalizados para ${profile.name}. Total: ${processedChats.size}.`,
        startDisabled: false,
        stopDisabled: true
      });
    } catch (error) {
      if (this.stopRequested) {
        this.log('Automação interrompida pelo usuário.');
      } else {
        this.log(`Erro durante a automação: ${error.message}`);
        throw error;
      }
    } finally {
      if (this.context) {
        try {
          await this.context.close();
        } catch (error) {
          this.log(`Falha ao fechar contexto: ${error.message}`);
        }
        this.context = null;
      }
      this.isRunning = false;
    }
  }

  async processVisibleChats(page, processedChats) {
    while (processedChats.size < SEND_LIMIT) {
      await this.ensureRunning();

      const chatLocators = await page.getByRole('listitem').all();
      if (!chatLocators.length) {
        this.log('Nenhum chat visível encontrado.');
        break;
      }

      let newChatsOnScreen = 0;

      for (const chat of chatLocators) {
        await this.ensureRunning();
        if (processedChats.size >= SEND_LIMIT) {
          break;
        }

        let chatName = '';

        try {
          const titleLocator = chat.locator('span[title]').first();
          await titleLocator.waitFor({ state: 'attached', timeout: 1_000 });
          chatName = await titleLocator.getAttribute('title');

          if (!chatName || processedChats.has(chatName)) {
            continue;
          }

          newChatsOnScreen += 1;
          this.log(`Processando "${chatName}" (${processedChats.size + 1}/${SEND_LIMIT})`);
          await chat.click();

          await this.sendMessage(page);
          processedChats.add(chatName);

          this.log('Mensagem enviada. Aguardando intervalo.');
          await page.waitForTimeout(MESSAGE_DELAY_MS);

          const backButton = page.getByRole('button', { name: 'Voltar' });
          const isBackVisible = await backButton.isVisible().catch(() => false);
          if (!isBackVisible) {
            await page.keyboard.press('Escape');
            await backButton.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => undefined);
          }

          if (processedChats.size > 0 && processedChats.size % 2 === 0) {
            this.log(`Rolando a lista após ${processedChats.size} envios…`);
            for (let i = 0; i < 12 && !this.stopRequested; i += 1) {
              await page.keyboard.press('PageDown');
              await page.waitForTimeout(500);
            }
          }
        } catch (error) {
          this.log(`Erro ao processar chat "${chatName}": ${error.message}`);
          const backButton = page.getByRole('button', { name: 'Voltar' });
          const isBackVisible = await backButton.isVisible().catch(() => false);
          if (!isBackVisible) {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1_000);
          }
        }
      }

      if (processedChats.size >= SEND_LIMIT || newChatsOnScreen === 0) {
        if (newChatsOnScreen === 0) {
          this.log('Nenhum chat novo encontrado nesta tela.');
        }
        break;
      }
    }
  }

  async sendMessage(page) {
    const attachButton = page.getByRole('button', { name: 'Anexar' });
    await attachButton.click();

    const photosButton = page.getByRole('button', { name: 'Fotos e vídeos' });
    await photosButton.waitFor({ state: 'visible', timeout: 10_000 });
    await photosButton.locator('input[type="file"]').setInputFiles(this.activeProfile.imagePath);

    const messageBox = page.getByRole('textbox', { name: 'Digite uma mensagem' });
    await messageBox.waitFor({ state: 'visible', timeout: 20_000 });
    await messageBox.fill(this.activeProfile.message);
    await messageBox.press('Enter');
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

  async ensureRunning() {
    if (this.stopRequested) {
      throw new Error('Execução interrompida pelo usuário.');
    }
  }
}

module.exports = new AutomationController();
