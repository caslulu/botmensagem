const { chromium } = require('playwright');
const { splitName, formatDateForUs } = require('../data-mapper');
const ChromeDetector = require('../../utils/chrome-detector');

function safeLower(value) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function mapVehicleOwnership(value) {
  const normalized = safeLower(value);
  if (!normalized) return 'C';
  if (normalized.includes('menos')) return 'A';
  if (normalized.includes('1-3')) return 'B';
  if (normalized.includes('3-5')) return 'C';
  return 'D';
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
  }

  async cleanup() {
    try {
      if (this.page && !this.page.isClosed()) {
        await this.page.close().catch(() => {});
      }
    } catch (e) { /* ignore */ }

    try {
      if (this.context) {
        await this.context.close().catch(() => {});
      }
    } catch (e) { /* ignore */ }

    try {
      if (this.browser && this.browser.isConnected()) {
        await this.browser.close().catch(() => {});
      }
    } catch (e) { /* ignore */ }

    this.page = null;
    this.context = null;
    this.browser = null;
  }

  async run(data, options = {}) {
    const launchOptions = {
      headless: options.headless ?? this.headless,
      args: ['--incognito']
    };

    const chromePath = ChromeDetector.detect();
    if (chromePath) {
      console.log(`[Progressive] Usando Google Chrome: ${chromePath}`);
      launchOptions.executablePath = chromePath;
    } else {
      console.log('[Progressive] Chrome não encontrado. Usando Chromium do Playwright');
    }

    const browser = await chromium.launch(launchOptions);
    const context = await browser.newContext();
    const page = await context.newPage();

    this.browser = browser;
    this.context = context;
    this.page = page;

    // Listener para detectar quando a página/browser é fechado externamente
    page.on('close', () => {
      console.log('[Progressive] Página fechada - limpando recursos...');
      this.cleanup();
    });

    context.on('close', () => {
      console.log('[Progressive] Contexto fechado - limpando recursos...');
      this.cleanup();
    });

    browser.on('disconnected', () => {
      console.log('[Progressive] Browser desconectado - limpando recursos...');
      this.cleanup();
    });

    try {
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
      return { success: false, error: error.message || String(error) };
    } finally {
      await this.cleanup();
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
        await links.first().click();
      } else {
        await this.page.getByRole('link', { name: /see all 30\+ products/i }).click();
      }
    } catch (error) {
      console.warn('[ProgressiveAutomation] Link "see all products" não encontrado:', error?.message || error);
    }

    await this.page.getByRole('option', { name: 'Auto', exact: true }).click({ timeout: 15000 });
    await this.page.getByRole('textbox', { name: 'Enter ZIP Code' }).fill(zipcode, { timeout: 15000 });
    await this.page.getByRole('button', { name: 'Get a quote' }).click({ timeout: 15000 });
  }

  async informacoesBasicas(data) {
    const dateValue = data.dataNascimentoUs || formatDateForUs(data.dataNascimento) || '01/01/1990';
    await this.page.getByLabel('First Name', { exact: true }).fill(data.firstName, { timeout: 15000 });
    await this.page.getByLabel('Last Name', { exact: true }).fill(data.lastName, { timeout: 15000 });
    await this.page.getByLabel('Primary email address').fill(data.email, { timeout: 15000 });
    await this.page.getByLabel('Date of birth*').fill(dateValue, { timeout: 15000 });
    await this.page.getByRole('button', { name: 'Continue' }).click({ timeout: 15000 });
    await this.page.getByRole('button', { name: 'Continue' }).click({ timeout: 15000 });
  }

  async informacoesEndereco(data) {
    const streetValue = (data.rua || '').trim() || 'Unknown';
  const aptValue = (data.apt || '').trim();
    const cityValue = (data.cidade || '').trim() || 'City';
    const streetField = this.page.getByRole('combobox', { name: 'Street number and name' });
    await streetField.click({ timeout: 15000 });
    await streetField.fill(streetValue, { timeout: 15000 });

    if (aptValue) {
      const aptField = this.page.getByRole('textbox', { name: 'Apt./Unit #' });
      await aptField.click({ timeout: 15000 });
      await aptField.fill(aptValue, { timeout: 15000 });
    }

    const cityField = this.page.getByRole('textbox', { name: 'City' });
    await cityField.click({ timeout: 15000 });
    await cityField.fill(cityValue, { timeout: 15000 });

    await this.page.getByRole('button', { name: 'Ok, start my quote' }).click({ timeout: 15000 });
  }

  async informacoesVeiculos(veiculos) {
    this.page.setDefaultTimeout(30000);

    try {
      this.page.setDefaultTimeout(7000);
      await this.page.getByRole('button', { name: "No, I'll add my own" }).click();
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
        await this.page.getByRole('button', { name: '+Add another vehicle' }).click({ timeout: 15000 });
      }

      await this.page.waitForSelector("a:has-text('Enter by VIN')", { timeout: 20000 });
      await this.page.click("a:has-text('Enter by VIN')");
      await this.page.waitForSelector("input[name='VehiclesNew_embedded_questions_list_Vin']", { timeout: 20000 });
      await this.page.fill("input[name='VehiclesNew_embedded_questions_list_Vin']", veiculo.vin);

      try {
        await this.page.getByLabel('Learn more aboutVehicle use*').selectOption('1');
      } catch (_) {
        // ignore
      }

      try {
        if (safeLower(veiculo.financiado).includes('financiado')) {
          await this.page.getByLabel('Own or lease?').selectOption('2');
        } else {
          await this.page.getByLabel('Own or lease?').selectOption('3');
        }
      } catch (_) {}

      try {
        const ownership = mapVehicleOwnership(veiculo.tempo_com_veiculo);
        await this.page.getByLabel('How long have you had this').selectOption(ownership);
      } catch (_) {}

      try {
        if (this.novaInterface) {
          await this.page.getByLabel('Learn more aboutAnnual').selectOption('0 - 3,999');
        } else {
          await this.page.getByLabel('Learn more aboutAnnual').selectOption({ index: 1 });
        }
      } catch (_) {}
    }
    await this.page.waitForTimeout(10000);
    await this.page.getByRole('button', { name: 'Continue' }).click({ timeout: 20000 });
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
      this.page.setDefaultTimeout(7000);
      await this.page.locator('#DriversAddPniDetails_embedded_questions_list_PrimaryResidence').selectOption('T');
    } catch (_) {
      try {
        await this.page.getByLabel('Highest level of education*').selectOption('2');
        await this.page.getByLabel('Employment status*').selectOption('EM');
        await this.page.getByRole('combobox', { name: 'Occupation view entire list' }).click();
        await this.page.getByRole('combobox', { name: 'Occupation view entire list' }).fill('worker');
        await this.page.getByText('Worker: All Other').click();
        await this.page.getByLabel('Primary residence*').selectOption('R');
      } catch (error) {
        console.warn('[ProgressiveAutomation] Falha ao preencher campos adicionais de residência:', error?.message || error);
      }
    } finally {
      this.page.setDefaultTimeout(30000);
    }

    try {
      if (safeLower(estadoDocumento) !== 'it') {
        await this.page.getByRole('group', { name: 'Has your license been valid' }).getByLabel('Yes').check();
        await this.page.getByRole('group', { name: 'Any license suspensions in' }).getByLabel('No').check();
      } else {
        await this.page.getByLabel('U.S. License type').selectOption('F');
      }
      await this.page.getByRole('group', { name: 'Accidents, claims, or other' }).getByLabel('No').check();
      await this.page.getByRole('group', { name: 'Tickets or violations?' }).getByLabel('No').check();
      await this.page.getByRole('button', { name: 'Continue' }).click({ timeout: 20000 });
    } catch (error) {
      console.warn('[ProgressiveAutomation] Falha ao preencher dados de licença do titular:', error?.message || error);
    }

    if (safeLower(estadoCivil).includes('casad') && nomeConjuge && dataNascimentoConjuge) {
      try {
        const [firstName, lastName] = splitName(nomeConjuge);
        await this.page.getByLabel('First Name').fill(firstName || 'Spouse');
        await this.page.getByLabel('Last Name').fill(lastName || '');
        await this.page.getByLabel('Date of birth').fill(dataNascimentoConjuge || '01/01/1990');

        if (safeLower(genero) === 'masculino') {
          await this.page.getByLabel('Female').check();
        } else {
          await this.page.getByLabel('Male', { exact: true }).check();
        }

        if (safeLower(estadoDocumento) !== 'it') {
          await this.page.getByRole('group', { name: 'Has your license been valid' }).getByLabel('Yes').check();
          await this.page.getByRole('group', { name: 'Any license suspensions in' }).getByLabel('No').check();
        } else {
          await this.page.getByLabel('U.S. License type').selectOption('F');
        }
        await this.page.getByRole('group', { name: 'Accidents, claims, or other' }).getByLabel('No').check();
        await this.page.getByRole('group', { name: 'Tickets or violations?' }).getByLabel('No').check();
        await this.page.getByRole('button', { name: 'Continue' }).click({ timeout: 20000 });
      } catch (error) {
        console.warn('[ProgressiveAutomation] Falha ao preencher dados do cônjuge:', error?.message || error);
      }
    }

    if (Array.isArray(pessoasExtras) && pessoasExtras.length) {
      for (const pessoa of pessoasExtras) {
        try {
          const [firstName, lastName] = splitName(pessoa.nome || '');
          await this.page.getByRole('button', { name: 'Add another person' }).click({ timeout: 20000 });
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
          await this.page.getByRole('group', { name: "Has this driver's license" }).getByLabel('Yes').check();
          await this.page.getByRole('group', { name: 'Any license suspensions in' }).getByLabel('No').check();
          await this.page.getByRole('group', { name: 'Accidents, claims, or other' }).getByLabel('No').check();
          await this.page.getByRole('group', { name: 'Tickets or violations?' }).getByLabel('No').check();
          await this.page.getByRole('button', { name: 'Continue' }).click({ timeout: 20000 });
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

      await this.page.getByRole('button', { name: 'Continue' }).click({ timeout: 20000 });
    } catch (error) {
      console.warn('[ProgressiveAutomation] Falha ao preencher seguro anterior:', error?.message || error);
    }
  }
}

module.exports = ProgressiveQuoteAutomation;
