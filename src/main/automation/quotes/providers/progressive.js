const { chromium } = require('playwright');
const { splitName, formatDateForUs } = require('../data-mapper');
const ChromeDetector = require('../../utils/chrome-detector');
const {
  STANDARD_QUOTE_DEFAULTS,
  isFinancedVehicle,
  mapInsuranceDuration,
  mapResidenceDuration,
  mapVehicleOwnership,
  safeLower
} = require('../quote-defaults');
const {
  checkFirstVisible,
  clickFirstVisible,
  fillFirstVisible,
  firstVisible,
  selectFirstVisible,
  typeSequentiallyFirstVisible,
  waitForAnyVisible
} = require('../playwright-helpers');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

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

  pickByPosition(locator, useLast = false) {
    if (!locator) {
      return locator;
    }
    if (useLast && typeof locator.last === 'function') {
      return locator.last();
    }
    if (typeof locator.first === 'function') {
      return locator.first();
    }
    return locator;
  }

  async answerChoiceInGroup(groupPatterns = [], answerText = 'No', { useLast = false } = {}) {
    const patterns = Array.isArray(groupPatterns) ? groupPatterns : [groupPatterns];

    for (const pattern of patterns) {
      const group = await firstVisible([
        () => this.pickByPosition(this.page.getByRole('group', { name: pattern }), useLast),
        () => this.pickByPosition(this.page.getByLabel(pattern), useLast)
      ]);

      if (!group) {
        continue;
      }

      const answered = await checkFirstVisible([
        () => group.getByLabel(answerText, { exact: true }),
        () => group.getByRole('radio', { name: answerText, exact: true })
      ], { force: true }).catch(() => false);

      if (answered) {
        return true;
      }

      const clicked = await clickFirstVisible([
        () => group.getByText(new RegExp(`^${answerText}$`, 'i')).first()
      ], { force: true }).catch(() => false);

      if (clicked) {
        return true;
      }
    }

    return false;
  }

  async preencherOccupationPadrao({ useLast = false } = {}) {
    const inputCandidates = [
      () => this.pickByPosition(this.page.getByPlaceholder(/Search for your job title/i), useLast),
      () => this.pickByPosition(this.page.getByRole('combobox', { name: /Occupation/i }), useLast),
      () => this.pickByPosition(this.page.getByLabel(/Occupation/i), useLast)
    ];

    const targetInput = await waitForAnyVisible(inputCandidates, 3000);
    if (!targetInput) {
      return false;
    }

    try {
      await targetInput.click({ timeout: 3000 });
    } catch (_) {
      // ignore
    }

    await typeSequentiallyFirstVisible([() => targetInput], STANDARD_QUOTE_DEFAULTS.occupationSearch, { delay: 100 }).catch(() => false);

    await clickFirstVisible([
      () => this.pickByPosition(this.page.getByRole('button', { name: 'Search' }), useLast)
    ], { timeout: 2000 }).catch(() => false);

    const optionClicked = await clickFirstVisible([
      () => this.page.getByRole('option', { name: /Worker.*All Other/i }).first(),
      () => this.page.getByText(/Worker.*All Other/i).first(),
      () => this.page.getByText('Transportation Worker').first()
    ], { timeout: 2500 }).catch(() => false);

    if (optionClicked) {
      return true;
    }

    try {
      await targetInput.press('Enter');
      return true;
    } catch (_) {
      return false;
    }
  }

  async preencherHistoricoLicencaPadrao({ estadoDocumento, useLast = false, ageFirstLicensed = STANDARD_QUOTE_DEFAULTS.ageFirstLicensed } = {}) {
    const isInternational = safeLower(estadoDocumento) === 'it';
    const licenseTypeCandidates = [
      () => this.pickByPosition(this.page.getByLabel('U.S. License type'), useLast)
    ];

    if (isInternational) {
      await selectFirstVisible(licenseTypeCandidates, ['F', { index: 1 }]).catch(() => false);
      return;
    }

    await selectFirstVisible(licenseTypeCandidates, [{ label: 'Personal' }, { index: 1 }]).catch(() => false);
    await selectFirstVisible([
      () => this.pickByPosition(this.page.getByLabel('U.S. License status'), useLast)
    ], [{ label: 'Valid' }, { index: 1 }]).catch(() => false);

    await fillFirstVisible([
      () => this.pickByPosition(this.page.getByLabel('Age first licensed*'), useLast),
      () => this.pickByPosition(this.page.getByLabel(/Age first licensed/i), useLast)
    ], ageFirstLicensed, { timeout: 5000 }).catch(() => false);

    await selectFirstVisible([
      () => this.pickByPosition(this.page.getByLabel('Years licensed*'), useLast),
      () => this.pickByPosition(this.page.getByLabel(/Years licensed in the U\.S\. or/i), useLast),
      () => this.pickByPosition(this.page.getByLabel(/Years licensed/i), useLast)
    ], [STANDARD_QUOTE_DEFAULTS.licenseYearsOption, { index: 1 }]).catch(() => false);

    await this.answerChoiceInGroup([/Has .*license been valid/i, /Has your license been valid/i], 'Yes', { useLast });
    await this.answerChoiceInGroup([/Any license suspensions/i], 'No', { useLast });
    await this.answerChoiceInGroup([/Has your license been valid continuously/i], 'Yes', { useLast });
    await this.answerChoiceInGroup([/License expired, suspended or revoked/i], 'No', { useLast });
  }

  async preencherPerguntasPadraoSemHistorico({ useLast = false } = {}) {
    await this.answerChoiceInGroup([/Accidents, claims, or other/i], 'No', { useLast });
    await this.answerChoiceInGroup([/DWIs/i], 'No', { useLast });
    await this.answerChoiceInGroup([/Tickets or violations/i], 'No', { useLast });
  }

  async preencherCamposVeiculoPadrao(veiculo = {}) {
    const annualMileageText = STANDARD_QUOTE_DEFAULTS.annualMileageText;
    const annualMileageBucket = STANDARD_QUOTE_DEFAULTS.annualMileageBucket;
    const ownLeaseValue = isFinancedVehicle(veiculo.financiado) ? '2' : '3';

    await waitForAnyVisible([
      () => this.page.getByLabel('Learn more aboutPrimary use*'),
      () => this.page.getByLabel('Learn more aboutVehicle use*'),
      () => this.page.getByRole('textbox', { name: /Estimated annual mileage|Number of Miles/i }),
      () => this.page.getByLabel(/How long have you had this vehicle/i),
      () => this.page.getByLabel('Own or lease?')
    ], 6000).catch(() => null);

    await selectFirstVisible([
      () => this.page.getByLabel('Learn more aboutPrimary use*'),
      () => this.page.getByLabel('Learn more aboutVehicle use*')
    ], ['1', { index: 1 }]).catch(() => false);

    await selectFirstVisible([
      () => this.page.getByLabel('Own or lease?')
    ], [ownLeaseValue]).catch(() => false);

    await selectFirstVisible([
      () => this.page.getByLabel(/How long have you had this vehicle/i)
    ], [mapVehicleOwnership(veiculo.tempo_com_veiculo), { index: 1 }]).catch(() => false);

    await fillFirstVisible([
      () => this.page.getByRole('textbox', { name: 'Estimated annual mileage' }),
      () => this.page.getByRole('textbox', { name: /Annual mileage|Number of Miles/i })
    ], annualMileageText).catch(() => false);

    await selectFirstVisible([
      () => this.page.getByLabel('Learn more aboutAnnual'),
      () => this.page.getByLabel(/Annual mileage/i)
    ], [annualMileageBucket, { index: 1 }]).catch(() => false);
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

    const nextStep = await waitForAnyVisible([
      () => this.page.getByRole('button', { name: 'Continue' }),
      () => this.page.getByRole('button', { name: /Ok, start my quote/i }),
      () => this.page.getByRole('combobox', { name: 'Street number and name' }),
      () => this.page.getByRole('textbox', { name: 'City' }),
      () => this.page.getByRole('textbox', { name: /ZIP Code/i })
    ], 6000);

    if (!nextStep) {
      return;
    }

    try {
      const text = await nextStep.textContent();
      const label = String(text || '').trim();
      if (/^continue$/i.test(label)) {
        await nextStep.click({ timeout: 10000 });
      }
    } catch (_) {
      // Se o próximo passo já for a tela de endereço, a próxima função assume.
    }
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
      await this.preencherCamposVeiculoPadrao(veiculo);

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

    try {
      await selectFirstVisible([
        () => this.page.locator('#DriversAddPniDetails_embedded_questions_list_HighestLevelOfEducation'),
        () => this.page.getByLabel(/Highest level of education/i)
      ], [STANDARD_QUOTE_DEFAULTS.educationOption, { index: 1 }]);

      await selectFirstVisible([
        () => this.page.locator('#DriversAddPniDetails_embedded_questions_list_EmploymentStatus'),
        () => this.page.getByLabel(/Employment status/i)
      ], [STANDARD_QUOTE_DEFAULTS.employmentOption, { index: 1 }]);

      await this.preencherOccupationPadrao();
    } catch (e) {
      console.log('Campos extras de emprego/educação não encontrados ou erro ao preencher:', e.message);
    }

    try {
      this.page.setDefaultTimeout(5000);
      await selectFirstVisible([
        () => this.page.getByLabel('Primary residence*'),
        () => this.page.locator('#DriversAddPniDetails_embedded_questions_list_PrimaryResidence')
      ], [STANDARD_QUOTE_DEFAULTS.primaryResidenceOption, { index: 1 }]);
    } catch (error) {
      console.warn('[ProgressiveAutomation] Falha ao preencher residência:', error?.message || error);
    } finally {
      this.page.setDefaultTimeout(30000);
    }

    try {
      await this.page.waitForTimeout(1000);
      await this.preencherHistoricoLicencaPadrao({
        estadoDocumento,
        ageFirstLicensed: STANDARD_QUOTE_DEFAULTS.ageFirstLicensed
      });
      await this.preencherPerguntasPadraoSemHistorico();

      await this.page.waitForTimeout(1000);
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
        } else if (titularGenero.includes('non') || titularGenero.includes('nb') || titularGenero.includes('não bin')) {
          spouseGenderOption = 'Nonbinary';
        }

        console.log(`[Progressive] Tentando selecionar gênero do cônjuge: ${spouseGenderOption}`);
        
        // Aguarda um pouco para garantir que a página carregou todos os elementos
        await this.page.waitForTimeout(1500);

        try {
          // Gênero - Usa locator CSS diretamente para o input radio dentro do fieldset/grupo de Gender
          // Estratégia: encontra todos os radios de gênero e clica no último (que é do cônjuge)
          
          if (spouseGenderOption === 'Male') {
            // Tenta localizar por CSS selector direto
            const maleInputs = this.page.locator('input[type="radio"][value="M"], input[type="radio"][name*="Gender"][value*="ale"]');
            const count = await maleInputs.count();
            if (count > 0) {
              await maleInputs.last().check({ force: true });
              await maleInputs.last().check({ force: true });
            } else {
              // Fallback: clica no texto "Male" que seja label
              await this.page.locator('text="Male"').last().click({ force: true });
              await this.page.locator('text="Male"').last().click({ force: true });
            }
          } else if (spouseGenderOption === 'Nonbinary') {
            const nbInputs = this.page.locator('input[type="radio"][value*="onbinary"], input[type="radio"][value="N"]');
            const count = await nbInputs.count();
            if (count > 0) {
              await nbInputs.last().check({ force: true });
            } else {
              await this.page.locator('text="Nonbinary"').last().click({ force: true });
            }
          } else {
            // Female
            const femaleInputs = this.page.locator('input[type="radio"][value="F"], input[type="radio"][name*="Gender"][value*="emale"]');
            const count = await femaleInputs.count();
            if (count > 0) {
              await femaleInputs.last().check({ force: true });
              await femaleInputs.last().check({ force: true });
            } else {
              await this.page.locator('text="Female"').last().click({ force: true });
              await this.page.locator('text="Female"').last().click({ force: true });
            }
          }
          
          // Aguarda após selecionar gênero para evitar "unclick"
          await this.page.waitForTimeout(800);
          
        } catch (e) {
          console.warn('[Progressive] Erro ao selecionar gênero do cônjuge:', e.message);
        }

        try {
          await selectFirstVisible([
            () => this.page.getByLabel(/Highest level of education/i).last()
          ], [STANDARD_QUOTE_DEFAULTS.educationOption, { index: 1 }]);

          await selectFirstVisible([
            () => this.page.getByLabel('Employment status*').last(),
            () => this.page.getByLabel(/Employment status/i).last()
          ], [STANDARD_QUOTE_DEFAULTS.employmentOption, { index: 1 }]);

          await this.preencherOccupationPadrao({ useLast: true });
        } catch (e) {
          console.warn('Campos extras de emprego/educação (Cônjuge) não encontrados ou erro:', e.message);
        }

        try {
          await this.preencherHistoricoLicencaPadrao({
            estadoDocumento,
            useLast: true,
            ageFirstLicensed: STANDARD_QUOTE_DEFAULTS.spouseAgeFirstLicensed
          });
          await this.preencherPerguntasPadraoSemHistorico({ useLast: true });
        } catch (e) {
          console.warn('Erro ao marcar histórico do cônjuge:', e.message);
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

          await this.preencherHistoricoLicencaPadrao({
            estadoDocumento: pessoa.documento_estado,
            ageFirstLicensed: STANDARD_QUOTE_DEFAULTS.spouseAgeFirstLicensed
          }).catch((e) => {
            console.warn('Erro ao marcar histórico do driver extra:', e.message);
          });

          await this.preencherPerguntasPadraoSemHistorico().catch((e) => {
            console.warn('Erro ao marcar perguntas padrão do driver extra:', e.message);
          });
          await this.clickButton(
            this.page.getByRole('button', { name: 'Continue' }),
            { timeout: 20000 }
          );
        } catch (error) {
          console.warn('[ProgressiveAutomation] Falha ao adicionar driver extra:', error?.message || error);
        }
      }
    }
  }

  async informacoesSeguroAnterior({ tempoDeSeguro, tempoNoEndereco }) {
    const { hasInsurance, option } = mapInsuranceDuration(tempoDeSeguro);

    try {
      if (!hasInsurance) {
        await this.answerChoiceInGroup([/Do you have auto insurance/i], 'No');
        await this.answerChoiceInGroup([/Have you had auto insurance in the last 31 days/i], 'No');
      } else {
        await this.answerChoiceInGroup([/Do you have auto insurance/i], 'Yes');
        if (option) {
          await selectFirstVisible([
            () => this.page.getByLabel('How long have you been with'),
            () => this.page.getByLabel(/How long have you been with/i)
          ], [option, { index: 1 }]);
        }
      }

      await this.answerChoiceInGroup([/Do you have non-auto policies/i], 'No');
      await this.answerChoiceInGroup([/Have you had auto insurance/i], 'No');

      try {
        const residenceOption = mapResidenceDuration(tempoNoEndereco);
        await selectFirstVisible([
          () => this.page.getByLabel('How long have you lived at'),
          () => this.page.getByLabel(/How long have you lived at/i)
        ], [residenceOption, { index: 1 }]);
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
