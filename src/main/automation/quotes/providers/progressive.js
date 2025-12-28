const { chromium } = require('playwright');
const { splitName, formatDateForUs } = require('../data-mapper');
const ChromeDetector = require('../../utils/chrome-detector');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

function safeLower(value) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function mapVehicleOwnership(value) {
  const normalized = safeLower(value);
  if (!normalized) return 'E';
  if (normalized.includes('less') || normalized.includes('menos') || normalized.includes('less than 1') || normalized.includes('1 month')) {
    return 'E';
  }
  if (normalized.includes('1 month - 1 year') || normalized.includes('1 ano') || normalized.includes('1 - 3') || normalized.includes('1-3')) {
    return 'A';
  }
  if (normalized.includes('1 year - 3 years') || normalized.includes('1-3 years') || normalized.includes('1-3')) {
    return 'B';
  }
  if (normalized.includes('3 years - 5 years') || normalized.includes('3-5 years') || normalized.includes('3-5')) {
    return 'C';
  }
  if (normalized.includes('5 years') || normalized.includes('5 ou mais') || normalized.includes('5 years or more') || normalized.includes('mais de 5')) {
    return 'D';
  }
  if (normalized.includes('>=5') || normalized.includes('5+')) {
    return 'D';
  }
  return 'E';
}

function mapInsuranceDuration(value) {
  const normalized = safeLower(value);
  if (!normalized) return { hasInsurance: true, option: 'C' };
  if (normalized.includes('nunca')) {
    return { hasInsurance: false, option: null };
  }
  if (normalized.includes('menos')) {
    return { hasInsurance: true, option: 'A' };
  }
  if (normalized.includes('1-3')) {
    return { hasInsurance: true, option: 'B' };
  }
  if (normalized.includes('3-5')) {
  return { hasInsurance: true, option: 'C' };
  }
  return { hasInsurance: true, option: 'D' };
}

function mapResidenceDuration(value) {
  const normalized = safeLower(value);
  if (!normalized) return 'B';
  if (normalized.includes('mais')) return 'C';
  return 'B';
}

class ProgressiveQuoteAutomation {
  constructor(options = {}) {
    this.headless = options.headless ?? false;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.browserProcess = null;
    this.isCleaningUp = false;
  }

  hasActivePage() {
    if (!this.page) {
      return false;
    }
    if (typeof this.page.isClosed === 'function') {
      return !this.page.isClosed();
    }
    return true;
  }

  async clickWithDelay(locator, options = {}, delayMs = 0) {
    if (!locator || typeof locator.click !== 'function') {
      throw new Error('Locator inválido informado para clickWithDelay');
    }
    if (delayMs > 0 && this.page?.waitForTimeout) {
      await this.page.waitForTimeout(delayMs);
    }
    return locator.click(options);
  }

  async clickButton(locator, options = {}) {
    return this.clickWithDelay(locator, options);
  }

  async selectWithPause(locator, values, pauseMs = 1000) {
    if (!locator || typeof locator.selectOption !== 'function') {
      throw new Error('Locator inválido informado para selectWithPause');
    }
    await locator.selectOption(values);
    if (pauseMs > 0 && this.page?.waitForTimeout) {
      await this.page.waitForTimeout(pauseMs);
    }
  }

  async ensureValidLicenseYes() {
    if (!this.page) {
      return false;
    }
    try {
      const validLicenseGroup = this.page.getByRole('group', { name: 'Has your license been valid' });
      if (await validLicenseGroup.isVisible()) {
        await validLicenseGroup.getByLabel('Yes').check();
        return true;
      }
    } catch (_) {
      // ignore
    }
    return false;
        await this.ensureValidLicenseYes();
  }

  async ensureFreshRun() {
    if (this.hasActivePage()) {
      throw new Error('Uma janela de cotação automática ainda está aberta. Finalize e feche o navegador antes de iniciar novamente.');
    }

    if (this.browser || this.context || this.page) {
      await this.cleanup().catch(() => {});
    }
  }

  async notifyManualFallback(error) {
    const baseMessage = 'Automação interrompida. A janela ficará aberta para que você conclua manualmente.';
    const detail = error?.message || String(error || '');
    console.warn('[ProgressiveAutomation] Transferindo preenchimento para o usuário:', detail);

    try {
      const { dialog } = require('electron');
      if (dialog?.showMessageBox) {
        await dialog.showMessageBox({
          type: 'warning',
          title: 'Cotação automática interrompida',
          message: baseMessage,
          detail: detail || undefined,
          buttons: ['Ok'],
          defaultId: 0
        });
      }
    } catch (_) {
      // Ambiente CLI/testes - sem dialog
    }
  }

  async killOrphanChrome() {
    try {
      if (process.platform === 'win32') {
        console.log('[Progressive] Matando processos Chrome/Chromium órfãos...');
        await execAsync('taskkill /F /IM chrome.exe /T 2>nul').catch(() => {});
        await execAsync('taskkill /F /IM chromium.exe /T 2>nul').catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (e) {
      console.warn('[Progressive] Não foi possível matar processos órfãos:', e.message);
    }
  }

  async cleanup() {
    if (this.isCleaningUp) {
      console.log('[Progressive] Cleanup já em andamento, ignorando chamada duplicada');
      return;
    }

    this.isCleaningUp = true;
    console.log('[Progressive] Iniciando cleanup...');
    
    let browserProcess = null;
    
    try {
      if (this.browser && typeof this.browser.process === 'function') {
        browserProcess = this.browser.process();
      }
    } catch (_) { /* ignore */ }

    try {
      if (this.page && !this.page.isClosed()) {
        console.log('[Progressive] Fechando página...');
        this.page.removeAllListeners();
        await this.page.close().catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (e) { /* ignore */ }

    try {
      if (this.context) {
        console.log('[Progressive] Fechando contexto...');
        this.context.removeAllListeners();
        await this.context.close().catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (e) { /* ignore */ }

    try {
      if (this.browser && this.browser.isConnected()) {
        console.log('[Progressive] Fechando browser...');
        this.browser.removeAllListeners();
        await this.browser.close().catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    } catch (e) { /* ignore */ }

    if (browserProcess && !browserProcess.killed) {
      console.log('[Progressive] Forçando término do processo do browser...');
      try {
        browserProcess.kill('SIGKILL');
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (_) { /* ignore */ }
    }

    await this.killOrphanChrome();

    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const { BrowserWindow } = require('electron');
      const allWindows = BrowserWindow.getAllWindows();
      const mainWindow = allWindows.find(w => !w.isDestroyed()) || allWindows[0];
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log('[Progressive] Restaurando foco para janela principal...');
        
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        
        mainWindow.show();
        mainWindow.focus();
        mainWindow.moveTop();
        
        mainWindow.setAlwaysOnTop(true);
        await new Promise(resolve => setTimeout(resolve, 200));
        mainWindow.setAlwaysOnTop(false);
        
        mainWindow.webContents.focus();
      }
    } catch (e) {
      console.warn('[Progressive] Erro ao restaurar foco:', e.message);
    }

    this.page = null;
    this.context = null;
    this.browser = null;
    this.isCleaningUp = false;
    
    console.log('[Progressive] Cleanup concluído');
  }

  async run(data, options = {}) {
    const launchOptions = {
      headless: options.headless ?? this.headless,
      args: [
        '--incognito',
        '--disable-web-security',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu'
      ]
    };

    const chromePath = ChromeDetector.detect();
    if (chromePath) {
      console.log(`[Progressive] Usando Google Chrome: ${chromePath}`);
      launchOptions.executablePath = chromePath;
    } else {
      console.log('[Progressive] Chrome não encontrado. Usando Chromium do Playwright');
    }

    let browser = null;
    let context = null;
    let page = null;
    const keepBrowserOnError = options.keepBrowserOnError ?? true;
    // Alterado para false para manter o navegador aberto ao final (sucesso ou erro)
    let shouldCleanup = false;

    try {
      await this.ensureFreshRun();
      browser = await chromium.launch(launchOptions);
      context = await browser.newContext();
      page = await context.newPage();

      this.browser = browser;
      this.context = context;
      this.page = page;

      // Listeners para detectar quando a página/browser é fechado externamente
      page.on('close', () => {
        console.log('[Progressive] Página fechada externamente - limpando recursos...');
        this.cleanup().catch(() => {});
      });

      context.on('close', () => {
        console.log('[Progressive] Contexto fechado externamente - limpando recursos...');
        this.cleanup().catch(() => {});
      });

      browser.on('disconnected', () => {
        console.log('[Progressive] Browser desconectado - limpando recursos...');
        this.cleanup().catch(() => {});
      });

      await this.paginaInicial(data.zipcode);
      await this.waitForNetworkSettled(6000);
      await this.informacoesBasicas(data);
      await this.informacoesEndereco(data);
      if (Array.isArray(data.veiculos) && data.veiculos.length) {
        await this.informacoesVeiculos(data.veiculos);
      }

      const pessoasExtras = this.preparePessoasExtras(data);
      await this.informacoesPessoais({
        genero: data.genero,
        estadoDocumento: data.estadoDocumento,
        estadoCivil: data.estadoCivil,
        nomeConjuge: data.nomeConjuge,
        dataNascimentoConjuge: data.dataNascimentoConjugeUs || formatDateForUs(data.dataNascimentoConjuge),
        pessoasExtras,
        titularNome: `${data.firstName} ${data.lastName}`
      });

      await this.informacoesSeguroAnterior({
        tempoDeSeguro: data.tempoDeSeguro,
        tempoNoEndereco: data.tempoNoEndereco
      });

      return { success: true };
    } catch (error) {
      console.error('[ProgressiveAutomation] Erro geral:', error);
      const browserKeptOpen = keepBrowserOnError && this.hasActivePage();
      if (browserKeptOpen) {
        shouldCleanup = false;
        await this.notifyManualFallback(error);
      }
      return {
        success: false,
        error: error?.message || String(error),
        browserKeptOpen
      };
    } finally {
      if (shouldCleanup) {
        await this.cleanup();
      }
    }
  }

  async waitForNetworkSettled(maxWait = 5000) {
    const timeout = Math.max(0, Number(maxWait) || 0) || 5000;

    try {
      await Promise.race([
        this.page.waitForLoadState('networkidle'),
        this.page.waitForTimeout(timeout)
      ]);
    } catch (error) {
      console.warn('[ProgressiveAutomation] Falha ao aguardar network idle:', error?.message || error);
    }

    // pequeno buffer para permitir que scripts agendem tarefas de paint
    await this.page.waitForTimeout(250).catch(() => {});
  }

  async paginaInicial(zipcode) {
    await this.page.goto('https://www.progressive.com/', { waitUntil: 'load' });

    try {
      const links = this.page.locator("a:has-text('Or, see all 30+ products'), a:has-text('See all 30+ products')");
      if ((await links.count()) > 0) {
        await this.clickWithDelay(links.first());
      } else {
        await this.clickWithDelay(this.page.getByRole('link', { name: /see all 30\+ products/i }));
      }
    } catch (error) {
      console.warn('[ProgressiveAutomation] Link "see all products" não encontrado:', error?.message || error);
    }

    await this.clickWithDelay(
      this.page.getByRole('option', { name: 'Auto', exact: true }),
      { timeout: 15000 }
    );
    await this.page.getByRole('textbox', { name: 'Enter ZIP Code' }).fill(zipcode, { timeout: 15000 });
    await this.clickButton(
      this.page.getByRole('button', { name: 'Get a quote' }),
      { timeout: 15000 }
    );
  }

  async informacoesBasicas(data) {
    const dateValue = data.dataNascimentoUs || formatDateForUs(data.dataNascimento) || '01/01/1990';
    await this.page.getByLabel('First Name', { exact: true }).fill(data.firstName, { timeout: 15000 });
    await this.page.getByLabel('Last Name', { exact: true }).fill(data.lastName, { timeout: 15000 });
    await this.page.getByLabel('Primary email address').fill(data.email, { timeout: 15000 });
    await this.page.getByLabel('Date of birth*').fill(dateValue, { timeout: 15000 });
    await this.clickButton(
      this.page.getByRole('button', { name: 'Continue' }),
      { timeout: 15000 }
    );
    await this.clickButton(
      this.page.getByRole('button', { name: 'Continue' }),
      { timeout: 15000 }
    );
  }

  async informacoesEndereco(data) {
    const streetValue = (data.rua || '').trim() || 'Unknown';
  const aptValue = (data.apt || '').trim();
    const cityValue = (data.cidade || '').trim() || 'City';
    const streetField = this.page.getByRole('combobox', { name: 'Street number and name' });
    await this.clickWithDelay(streetField, { timeout: 15000 });
    await streetField.fill(streetValue, { timeout: 15000 });

    if (aptValue) {
      const aptField = this.page.getByRole('textbox', { name: 'Apt./Unit #' });
      await this.clickWithDelay(aptField, { timeout: 15000 });
      await aptField.fill(aptValue, { timeout: 15000 });
    }

    const cityField = this.page.getByRole('textbox', { name: 'City' });
    await this.clickWithDelay(cityField, { timeout: 15000 });
    await cityField.fill(cityValue, { timeout: 15000 });

    await this.clickButton(
      this.page.getByRole('button', { name: 'Ok, start my quote' }),
      { timeout: 15000 }
    );
  }

  async informacoesVeiculos(veiculos) {
    this.page.setDefaultTimeout(30000);

    try {
      this.page.setDefaultTimeout(7000);
      await this.clickButton(this.page.getByRole('button', { name: "No, I'll add my own" }));
    } catch (_) {
      // ignore
    } finally {
      this.page.setDefaultTimeout(30000);
    }

    if (this.novaInterface === undefined) {
      this.novaInterface = await this.page.isVisible("label:has-text('Vehicle use')");
    }

    for (let index = 0; index < veiculos.length; index += 1) {
      const veiculo = veiculos[index];
      if (!veiculo?.vin) {
        continue;
      }

      if (index > 0) {
        await this.page.waitForTimeout(2000);
        await this.clickButton(
          this.page.getByRole('button', { name: '+Add another vehicle' }),
          { timeout: 15000 }
        );
      }

      await this.page.waitForSelector("a:has-text('Enter by VIN')", { timeout: 20000 });
      await this.clickWithDelay(this.page.locator("a:has-text('Enter by VIN')"));
      await this.page.waitForSelector("input[name='VehiclesNew_embedded_questions_list_Vin']", { timeout: 20000 });
      await this.page.fill("input[name='VehiclesNew_embedded_questions_list_Vin']", veiculo.vin);

      // Aguarda um pouco para a interface atualizar após o VIN
      await this.page.waitForTimeout(2000);

      // Verifica se é o fluxo com inputs de texto (CA, FL, etc)
      let isTextFlow = false;
      try {
        // Tenta esperar pelo seletor específico da Califórnia ou Florida (Mileage Textbox)
        const primaryUse = this.page.getByLabel('Learn more aboutPrimary use*');
        const annualMileage = this.page.getByRole('textbox', { name: 'Estimated annual mileage' });

        await Promise.race([
          primaryUse.waitFor({ state: 'visible', timeout: 3000 }),
          annualMileage.waitFor({ state: 'visible', timeout: 3000 })
        ]);
        isTextFlow = true;
      } catch (e) {
        isTextFlow = false;
      }

      console.log(`Fluxo Texto (CA/FL) detectado: ${isTextFlow}`);

      if (isTextFlow) {
        console.log('Preenchendo campos do fluxo Texto (CA/FL)...');
        
        // Primary use -> Commute (Option 1)
        try {
          const primaryUse = this.page.getByLabel('Learn more aboutPrimary use*');
          if (await primaryUse.isVisible()) {
            await primaryUse.selectOption('1');
          }
        } catch (e) {
          console.warn('Erro ao preencher Primary use (CA/FL):', e.message);
        }

        // Estimated annual mileage -> 3000
        try {
          const annualMileage = this.page.getByRole('textbox', { name: 'Estimated annual mileage' });
          if (await annualMileage.isVisible()) {
            await annualMileage.click();
            await annualMileage.fill('3000');
          }
        } catch (e) {
          console.warn('Erro ao preencher Annual Mileage (CA/FL):', e.message);
        }

        // Own or lease?
        try {
          const ownLeaseField = this.page.getByLabel('Own or lease?');
          if (await ownLeaseField.isVisible()) {
            if (safeLower(veiculo.financiado).includes('financiado')) {
              await ownLeaseField.selectOption('2');
            } else {
              await ownLeaseField.selectOption('3');
            }
          }
        } catch (e) {
          console.warn('Erro ao preencher Own/Lease (CA/FL):', e.message);
        }

      } else {
        // Fluxo Padrão
        try {
          await this.selectWithPause(this.page.getByLabel('Learn more aboutVehicle use*'), '1');
        } catch (_) {
          // ignore
        }

        try {
          const ownLeaseField = this.page.getByLabel('Own or lease?');
          if (safeLower(veiculo.financiado).includes('financiado')) {
            await this.selectWithPause(ownLeaseField, '2');
          } else {
            await this.selectWithPause(ownLeaseField, '3');
          }
        } catch (_) {}

        try {
          const ownership = mapVehicleOwnership(veiculo.tempo_com_veiculo);
          const ownershipField = this.page.getByLabel(/How long have you had this vehicle/i);
          await ownershipField.waitFor({ state: 'visible', timeout: 8000 });
          await this.selectWithPause(ownershipField, ownership);
        } catch (_) {}

        try {
          if (this.novaInterface) {
            await this.selectWithPause(this.page.getByLabel('Learn more aboutAnnual'), '0 - 3,999');
          } else {
            await this.selectWithPause(this.page.getByLabel('Learn more aboutAnnual'), { index: 1 });
          }
        } catch (_) {}
      }

      // Tenta clicar em "Done" para salvar o veículo atual antes de prosseguir
      // Isso é crucial para voltar à lista de veículos e permitir adicionar o próximo
      try {
        const doneBtn = this.page.getByRole('button', { name: 'Done' });
        if (await doneBtn.isVisible({ timeout: 2000 })) {
          await doneBtn.click();
          await this.page.waitForTimeout(1000);
        }
      } catch (e) {
        console.log('[Progressive] Botão Done não encontrado ou não necessário:', e.message);
      }
    }
    await this.page.waitForTimeout(2000);
    
    // Se houver mais de um veículo, pode ser necessário clicar em "Continue" para sair da lista
    // Mas o loop já tratou de adicionar todos. Agora finalizamos a seção.
    await this.clickButton(
      this.page.getByRole('button', { name: 'Continue' }),
      { timeout: 20000 }
    );
  }

  preparePessoasExtras(data) {
    const titular = safeLower(`${data.firstName} ${data.lastName}`.trim());
    const conjuge = safeLower((data.nomeConjuge || '').trim());

    return (data.pessoasExtras || []).filter((pessoa) => {
      const nome = safeLower(pessoa?.nome || '');
      if (!nome) return false;
      return nome !== titular && (!conjuge || nome !== conjuge);
    });
  }

  async informacoesPessoais({ genero, estadoDocumento, estadoCivil, nomeConjuge, dataNascimentoConjuge, pessoasExtras }) {
    try {
      if (safeLower(genero) === 'masculino') {
        await this.page.getByLabel('Male', { exact: true }).check();
      } else {
        await this.page.getByLabel('Female').check();
      }
    } catch (error) {
      console.warn('[ProgressiveAutomation] Falha ao selecionar gênero titular:', error?.message || error);
    }

    try {
      if (safeLower(estadoCivil).includes('casad')) {
        await this.page.getByLabel('Marital status').selectOption('M');
      } else {
        await this.page.getByLabel('Marital status').selectOption('S');
      }
    } catch (error) {
      console.warn('[ProgressiveAutomation] Falha ao selecionar estado civil:', error?.message || error);
    }

    // 1. Tenta preencher campos de Educação/Emprego (se existirem)
    try {
      const educationId = '#DriversAddPniDetails_embedded_questions_list_HighestLevelOfEducation';
      const employmentId = '#DriversAddPniDetails_embedded_questions_list_EmploymentStatus';

      // Education
      const educationLoc = this.page.locator(educationId);
      if (await educationLoc.isVisible()) {
        await educationLoc.selectOption('2');
      } else {
        const educationSelect = this.page.getByLabel(/Highest level of education/i);
        if (await educationSelect.isVisible()) {
          await educationSelect.selectOption('2');
        }
      }

      // Employment
      const employmentLoc = this.page.locator(employmentId);
      if (await employmentLoc.isVisible()) {
        await employmentLoc.selectOption('EM');
      } else {
        const employmentSelect = this.page.getByLabel(/Employment status/i);
        if (await employmentSelect.isVisible()) {
          await employmentSelect.selectOption('EM');
        }
      }

      // Occupation
      try {
        console.log('Tentando preencher Occupation...');
        
        const searchInput = this.page.getByPlaceholder('Search for your job title...');
        const combobox = this.page.getByRole('combobox', { name: 'Occupation view entire list' });

        let targetInput = null;
        let isNewVariation = false;

        // Verifica qual está visível
        if (await searchInput.isVisible()) {
          targetInput = searchInput;
          isNewVariation = true;
        } else if (await combobox.isVisible()) {
          targetInput = combobox;
        } else {
          // Se nenhum visível, espera um pouco
          try {
            await searchInput.waitFor({ state: 'visible', timeout: 3000 });
            targetInput = searchInput;
            isNewVariation = true;
          } catch {
            try {
              await combobox.waitFor({ state: 'visible', timeout: 3000 });
              targetInput = combobox;
            } catch {
              console.log('Nenhum input principal de Occupation apareceu no tempo limite.');
            }
          }
        }

        if (targetInput) {
          console.log(isNewVariation ? 'Variação "Search" encontrada.' : 'Variação "Combobox" encontrada.');
          await targetInput.click();
          await this.page.waitForTimeout(500);
          
          // Usa pressSequentially para garantir que o site registre a digitação
          await targetInput.pressSequentially('worker', { delay: 100 });
          await this.page.waitForTimeout(1000);
          
          if (isNewVariation) {
            const searchBtn = this.page.getByRole('button', { name: 'Search' });
            if (await searchBtn.isVisible()) {
              await searchBtn.click();
              await this.page.waitForTimeout(1000);
            }

            // Para a variação de busca, tenta selecionar "Transportation Worker"
            const transOption = this.page.getByText('Transportation Worker').first();
            if (await transOption.isVisible()) {
              await transOption.click();
            } else {
              // Fallback se não achar Transportation Worker
              const option = this.page.getByText(/Worker.*All Other/i).first();
              if (await option.isVisible()) {
                await option.click();
              } else {
                await targetInput.press('Enter');
              }
            }
          } else {
            // Variação Combobox
            const option = this.page.getByText(/Worker.*All Other/i).first();
            if (await option.isVisible()) {
              await option.click();
            } else {
              console.log('Opção não encontrada, tentando Enter...');
              await targetInput.press('Enter');
            }
          }
        } else {
          throw new Error('Nenhum input principal encontrado');
        }
      } catch (e) {
        console.error('Erro ao preencher Occupation (tentativa principal):', e.message);
        
        // Fallback: Tenta pelo label genérico se o role específico falhar
        try {
          console.log('Tentando fallback para Occupation...');
          // Usa .first() para evitar erro de strict mode se houver múltiplos elementos (ex: input + botão search)
          const fallbackInput = this.page.getByLabel(/Occupation/i).first();
          if (await fallbackInput.isVisible()) {
            await fallbackInput.click();
            await fallbackInput.fill('worker');
            await this.page.waitForTimeout(1000);
            await fallbackInput.press('Enter');
          }
        } catch (fallbackError) {
          console.error('Erro no fallback de Occupation:', fallbackError.message);
        }
      }
    } catch (e) {
      console.log('Campos extras de emprego/educação não encontrados ou erro ao preencher:', e.message);
    }

    // 2. Tenta preencher Residência
    try {
      this.page.setDefaultTimeout(5000);
      await this.page.getByLabel('Primary residence*').selectOption('T');
    } catch (_) {
      console.log('[Progressive] Falha no seletor principal de residência, tentando fallback...');
      try {
        await this.page.locator('#DriversAddPniDetails_embedded_questions_list_PrimaryResidence').selectOption('T');
      } catch (error) {
        console.warn('[ProgressiveAutomation] Falha ao preencher residência (fallback):', error?.message || error);
      }
    } finally {
      this.page.setDefaultTimeout(30000);
    }

    try {
      if (safeLower(estadoDocumento) !== 'it') {
        console.log('Verificando campos de histórico de licença...');
        
        await this.page.waitForTimeout(1000);

        // Seletores para os diferentes fluxos
        const usLicenseType = this.page.getByLabel('U.S. License type');
        const ageFirstLicensed = this.page.getByLabel('Age first licensed*');
        const yearsLicensedLong = this.page.getByLabel(/Years licensed in the U.S. or/i);
        const validLicense = this.page.getByRole('group', { name: 'Has your license been valid' });

        // 1. Verifica Fluxo Detalhado (Type + Status + Years)
        if (await usLicenseType.isVisible()) {
          console.log('Fluxo detalhado (Type/Status) detectado.');
          
          // U.S. License type -> Personal
          await usLicenseType.selectOption({ label: 'Personal' }).catch(() => usLicenseType.selectOption({ index: 1 }));
          
          // U.S. License status -> Valid
          const status = this.page.getByLabel('U.S. License status');
          if (await status.isVisible()) {
            await status.selectOption({ label: 'Valid' }).catch(() => status.selectOption({ index: 1 }));
          }

          // Years licensed (qualquer variação do label)
          const yearsAny = this.page.getByLabel(/Years licensed/i);
          if (await yearsAny.isVisible()) {
            await yearsAny.selectOption('3');
          }

          // Suspensions
          const suspensions = this.page.getByRole('group', { name: /Any license suspensions/i });
          if (await suspensions.isVisible()) {
            await suspensions.getByLabel('No').check();
          }

          // Has your license been valid continuously for the last 12 months?
          try {
            const validContinuously = this.page.getByRole('group', { name: /Has your license been valid continuously/i });
            if (await validContinuously.isVisible()) {
              await validContinuously.getByLabel('Yes').check();
            }
          } catch (e) {
            console.warn('Erro ao marcar valid license continuously:', e.message);
          }

        }
        // 1.5 Verifica Fluxo California (Status + Age First Licensed)
        else if (await ageFirstLicensed.isVisible()) {
          console.log('Fluxo California (Age first licensed) detectado.');
          await ageFirstLicensed.fill('16');
          
          console.log('Aguardando 10s para conferência manual da idade...');
          await this.page.waitForTimeout(10000);

          const status = this.page.getByLabel('U.S. License status');
          if (await status.isVisible()) {
            await status.selectOption({ label: 'Valid' }).catch(() => status.selectOption({ index: 1 }));
          }
          
          const expired = this.page.getByRole('group', { name: /License expired, suspended or revoked/i });
          if (await expired.isVisible()) {
            await expired.getByLabel('No').check();
          }
        } 
        // 2. Verifica Fluxo Intermediário (Apenas Years Licensed longo)
        else if (await yearsLicensedLong.isVisible()) {
          console.log('Campo "Years licensed" (fluxo simplificado) detectado.');
          await yearsLicensedLong.selectOption('3');
        } 
        // 3. Verifica Fluxo Antigo (Valid License Checkbox)
        else if (await validLicense.isVisible()) {
          console.log('Campo "Has your license been valid" detectado.');
          await validLicense.getByLabel('Yes').check();
          await this.page.getByRole('group', { name: 'Any license suspensions in' }).getByLabel('No').check();
        } 
        // 4. Fallback: Espera explícita se nada apareceu ainda
        else {
          console.log('Nenhum campo visível imediatamente. Aguardando...');
          try {
            // Tenta esperar pelo License Type primeiro (novo fluxo comum)
            await usLicenseType.waitFor({ state: 'visible', timeout: 3000 });
            // Se apareceu, chama recursivamente ou repete a lógica (aqui vou repetir simplificado)
            await usLicenseType.selectOption({ label: 'Personal' }).catch(() => usLicenseType.selectOption({ index: 1 }));
            const status = this.page.getByLabel('U.S. License status');
            if (await status.isVisible()) await status.selectOption({ label: 'Valid' }).catch(() => {});
            const years = this.page.getByLabel(/Years licensed/i);
            if (await years.isVisible()) await years.selectOption('3');
            const susp = this.page.getByRole('group', { name: /Any license suspensions/i });
            if (await susp.isVisible()) await susp.getByLabel('No').check();
          } catch (e) {
            // Se falhar, tenta o fluxo antigo como último recurso
            console.log('Fallback final para fluxo antigo...');
            if (await validLicense.isVisible()) {
               await validLicense.getByLabel('Yes').check();
               await this.page.getByRole('group', { name: 'Any license suspensions in' }).getByLabel('No').check();
            }
          }
        }
      } else {
        await this.page.getByLabel('U.S. License type').selectOption('F');
      }

      await this.page.waitForTimeout(1000);

      // Accidents
      try {
        await this.page.getByRole('group', { name: /Accidents, claims, or other/i }).getByLabel('No').check();
      } catch (e) { console.warn('Erro ao marcar Accidents:', e.message); }
      
      // DWIs (California e outros estados)
      try {
        const dwiGroup = this.page.getByRole('group', { name: /DWIs/i });
        if (await dwiGroup.isVisible()) {
          await dwiGroup.getByLabel('No').check();
        }
      } catch (e) { console.warn('Erro ao marcar DWIs:', e.message); }

      // Tickets
      try {
        await this.page.getByRole('group', { name: /Tickets or violations/i }).getByLabel('No').check();
      } catch (e) { console.warn('Erro ao marcar Tickets:', e.message); }
      
      await this.page.waitForTimeout(1500);
      await this.clickButton(
        this.page.getByRole('button', { name: 'Continue' }),
        { timeout: 20000 }
      );
    } catch (error) {
      console.warn('[ProgressiveAutomation] Falha ao preencher dados de licença do titular:', error?.message || error);
    }

    if (safeLower(estadoCivil).includes('casad') && nomeConjuge && dataNascimentoConjuge) {
      try {
        const [firstName, lastName] = splitName(nomeConjuge);
        await this.page.getByLabel('First Name').fill(firstName || 'Spouse');
        await this.page.getByLabel('Last Name').fill(lastName || '');
        await this.page.getByLabel('Date of birth').fill(dataNascimentoConjuge || '01/01/1990');

        const titularGenero = safeLower(genero || '');
        let spouseGenderOption = 'Female';
        if (titularGenero.includes('fem')) {
          spouseGenderOption = 'Male';
        } else if (titularGenero.includes('non') || titularGenero.includes('nb') || titularGenero.includes('n e3o bin')) {
          spouseGenderOption = 'Nonbinary';
        }

        try {
          const genderGroup = this.page.getByRole('group', { name: /Gender/i });
          if (await genderGroup.isVisible()) {
            await genderGroup.getByRole('radio', { name: spouseGenderOption }).check();
          } else {
            await this.page.getByRole('radio', { name: spouseGenderOption }).check();
          }
        } catch (_) {
          // Fallback para seletores antigos baseados em label
          if (spouseGenderOption === 'Female') {
            await this.page.getByLabel('Female').check();
          } else if (spouseGenderOption === 'Male') {
            await this.page.getByLabel('Male', { exact: true }).check();
          }
        }

        if (safeLower(estadoDocumento) !== 'it') {
          try {
            const validSpouse = this.page.getByRole('group', { name: /Has your license been valid/i });
            if (await validSpouse.isVisible()) {
              await validSpouse.getByLabel('Yes').check();
            }
          } catch (e) {
            console.warn('Erro ao marcar validade de licença do cônjuge:', e.message);
          }

          try {
            const suspSpouse = this.page.getByRole('group', { name: /Any license suspensions/i });
            if (await suspSpouse.isVisible()) {
              await suspSpouse.getByLabel('No').check();
            }
          } catch (e) {
            console.warn('Erro ao marcar suspensões do cônjuge:', e.message);
          }
        } else {
          await this.page.getByLabel('U.S. License type').selectOption('F');
        }

        try {
          const accidentsSpouse = this.page.getByRole('group', { name: /Accidents, claims, or other/i });
          if (await accidentsSpouse.isVisible()) {
            await accidentsSpouse.getByLabel('No').check();
          }
        } catch (e) {
          console.warn('Erro ao marcar acidentes do cônjuge:', e.message);
        }

        try {
          const ticketsSpouse = this.page.getByRole('group', { name: /Tickets or violations/i });
          if (await ticketsSpouse.isVisible()) {
            await ticketsSpouse.getByLabel('No').check();
          }
        } catch (e) {
          console.warn('Erro ao marcar tickets do cônjuge:', e.message);
        }

        // Garante que todos os campos importantes do cônjuge foram exibidos pelo menos uma vez
        await this.page.waitForTimeout(1500);

        await this.clickButton(
          this.page.getByRole('button', { name: 'Continue' }),
          { timeout: 20000 }
        );
      } catch (error) {
        console.warn('[ProgressiveAutomation] Falha ao preencher dados do cônjuge:', error?.message || error);
      }
    }

    if (Array.isArray(pessoasExtras) && pessoasExtras.length) {
      for (const pessoa of pessoasExtras) {
        try {
          const [firstName, lastName] = splitName(pessoa.nome || '');
          await this.clickButton(
            this.page.getByRole('button', { name: 'Add another person' }),
            { timeout: 20000 }
          );
          await this.page.getByRole('textbox', { name: 'First name' }).fill(firstName || 'Driver');
          await this.page.getByRole('textbox', { name: 'Last name' }).fill(lastName || '');

          const generoPessoa = safeLower(pessoa.genero);
          if (generoPessoa === 'masculino') {
            await this.page.getByRole('radio', { name: 'Male' }).check();
          } else {
            await this.page.getByRole('radio', { name: 'Female' }).check();
          }

          const nascimento = formatDateForUs(pessoa.data_nascimento) || '01/01/1990';
          await this.page.getByRole('textbox', { name: 'Date of birth' }).fill(nascimento);
          await this.page.getByLabel('Marital status*').selectOption('S');
          await this.page.getByLabel('Relationship to', { exact: false }).selectOption('O');

          // Histórico de licença do driver extra
          try {
            const validExtra = this.page.getByRole('group', { name: /Has .*license been valid/i });
            if (await validExtra.isVisible()) {
              await validExtra.getByLabel('Yes').check();
            }
          } catch (e) {
            console.warn('Erro ao marcar validade de licença do driver extra:', e.message);
          }

          try {
            const suspExtra = this.page.getByRole('group', { name: /Any license suspensions/i });
            if (await suspExtra.isVisible()) {
              await suspExtra.getByLabel('No').check();
            }
          } catch (e) {
            console.warn('Erro ao marcar suspensões do driver extra:', e.message);
          }

          try {
            const accidentsExtra = this.page.getByRole('group', { name: /Accidents, claims, or other/i });
            if (await accidentsExtra.isVisible()) {
              await accidentsExtra.getByLabel('No').check();
            }
          } catch (e) {
            console.warn('Erro ao marcar acidentes do driver extra:', e.message);
          }

          try {
            const ticketsExtra = this.page.getByRole('group', { name: /Tickets or violations/i });
            if (await ticketsExtra.isVisible()) {
              await ticketsExtra.getByLabel('No').check();
            }
          } catch (e) {
            console.warn('Erro ao marcar tickets do driver extra:', e.message);
          }
          await this.clickButton(
            this.page.getByRole('button', { name: 'Continue' }),
            { timeout: 20000 }
          );
        } catch (error) {
          console.warn('[ProgressiveAutomation] Falha ao adicionar driver extra:', error?.message || error);
        }
      }
    }
          await this.clickButton(
        this.page.getByRole('button', { name: 'Continue' }),
        { timeout: 20000 }
      );
                await this.clickButton(
        this.page.getByRole('button', { name: 'Continue' }),
        { timeout: 20000 }
      );
  }

  async informacoesSeguroAnterior({ tempoDeSeguro, tempoNoEndereco }) {
    const { hasInsurance, option } = mapInsuranceDuration(tempoDeSeguro);

    try {
      if (!hasInsurance) {
        await this.page.getByLabel('Do you have auto insurance').getByLabel('No').check();
        await this.page.getByLabel('Have you had auto insurance in the last 31 days?*').getByLabel('No').check();
      } else {
        await this.page.getByLabel('Do you have auto insurance').getByLabel('Yes').check();
        if (option) {
          await this.page.getByLabel('How long have you been with').selectOption(option);
        }
      }

      await this.page.getByLabel('Do you have non-auto policies').getByLabel('No').check();
      await this.page.getByLabel('Have you had auto insurance').getByLabel('No').check();

      try {
        const residenceOption = mapResidenceDuration(tempoNoEndereco);
        await this.page.getByLabel('How long have you lived at').selectOption(residenceOption);
      } catch (error) {
        console.warn('[ProgressiveAutomation] Falha ao selecionar tempo no endereço:', error?.message || error);
      }

      await this.clickButton(
        this.page.getByRole('button', { name: 'Continue' }),
        { timeout: 20000 }
      );
    } catch (error) {
      console.warn('[ProgressiveAutomation] Falha ao preencher seguro anterior:', error?.message || error);
    }
  }
}

module.exports = ProgressiveQuoteAutomation;
