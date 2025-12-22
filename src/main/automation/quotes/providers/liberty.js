const { chromium } = require('playwright');
const ChromeDetector = require('../../utils/chrome-detector');

class LibertyQuoteAutomation {
  constructor(options = {}) {
    this.headless = options.headless ?? false;
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  generateUsPhone() {
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const area = rand(200, 989); // avoid 0xx/1xx
    const mid = rand(200, 999);
    const last = rand(1000, 9999);
    return `(${area}) ${mid}-${last}`;
  }

  hasActivePage() {
    if (!this.page) return false;
    if (typeof this.page.isClosed === 'function') return !this.page.isClosed();
    return true;
  }

  async cleanup() {
    try {
      if (this.page && !this.page.isClosed()) await this.page.close().catch(() => {});
      if (this.context) await this.context.close().catch(() => {});
      if (this.browser) await this.browser.close().catch(() => {});
    } catch (_) {}
    this.page = null;
    this.context = null;
    this.browser = null;
  }

  async run(data = {}, options = {}) {
    const launchOptions = {
      headless: options.headless ?? this.headless,
      args: [
        '--incognito',
        '--disable-web-security',
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox'
      ]
    };

    const chromePath = ChromeDetector.detect();
    if (chromePath) launchOptions.executablePath = chromePath;

    // If pause requested, force headed mode and open devtools/inspector
    if (options.pause) {
      launchOptions.headless = false;
      launchOptions.devtools = true;
      try {
        process.env.PWDEBUG = '1';
      } catch (_) {}
    }

    let browser;
    let context;
    let page;

    try {
      browser = await chromium.launch(launchOptions);
      context = await browser.newContext();
      page = await context.newPage();
      this.browser = browser;
      this.context = context;
      this.page = page;

      await page.goto('https://www.libertymutual.com/', { waitUntil: 'load', timeout: 30000 });

      const zipcode = String(data.zipcode || '').trim();
      if (!zipcode) {
        throw new Error('ZIP code not provided for Liberty automation');
      }

      try {
        const lbl = page.locator('#tb-quote-zipCode-label');
        if (await lbl.count() > 0) await lbl.first().click().catch(() => {});
      } catch (_) {}

      try {
        await page.getByRole('textbox', { name: 'ZIP Code' }).fill(zipcode, { timeout: 10000 });
      } catch (e) {
        // fallback: try common input selectors
        await page.fill('input[name="zipcode"], input[id*="zip"], input[placeholder*="ZIP"], input[type="text"]', zipcode).catch(() => {});
      }

      try {
        const btn = page.getByRole('button', { name: 'Get my price' });
        if (await btn.count() > 0) {
          await btn.first().click({ timeout: 10000 });
        } else {
          await page.getByRole('button', { name: 'Get a quote' }).click({ timeout: 10000 }).catch(() => {});
        }
      } catch (_) {}

      console.log('Liberty automation completed initial steps.');
        await page.waitForTimeout(3500);

        try {
          try {
            await page.getByRole('button', { name: 'Close' }).click();
          } catch (_) {}

          const firstName = String(data.firstName || data.first_name || data.first || '').trim();
          const lastName = String(data.lastName || data.last_name || data.last || '').trim();
          const birthday = String(data.dataNascimentoUs || data.birthday || data.dob || '').trim() || '10/10/2000';

          if (firstName) await page.getByRole('textbox', { name: 'First name' }).fill(firstName).catch(() => {});
          if (lastName) await page.getByRole('textbox', { name: 'Last name' }).fill(lastName).catch(() => {});
          if (birthday) {
            try {
              const dobField = page.getByRole('textbox', { name: 'Birthday (MM/DD/YYYY)' });
              await dobField.click();
              await dobField.type(birthday, { delay: 100 });
            } catch (_) {}
          }

          try {
            const nextBtn = page.getByRole('button', { name: 'Next' });
            if (await nextBtn.count() > 0) await nextBtn.first().click().catch(() => {});
          } catch (_) {}

          const address1 = String(data.rua || data.address1 || data.address || '').trim();
          const address2 = String(data.apt || data.address2 || data.address_2 || '').trim();
          const zip = String(data.zipcode || data.zip || '').trim();
          const city = String(data.cidade || data.city || '').trim();

          if (address1) await page.getByRole('textbox', { name: 'Address 1' }).fill(address1).catch(() => {});
          if (address2) await page.getByRole('textbox', { name: 'Address 2' }).fill(address2).catch(() => {});
          if (zip) await page.getByRole('textbox', { name: /ZIP code|ZIP Code|ZIP/ }).fill(zip).catch(() => {});
          if (city) await page.getByRole('textbox', { name: 'City' }).fill(city).catch(() => {});

          // Click Next after address
          try {
            const nextBtn2 = page.getByRole('button', { name: 'Next' });
            if (await nextBtn2.count() > 0) await nextBtn2.first().click().catch(() => {});
          } catch (_) {}

          try { await page.locator('label').filter({ hasText: 'Yes' }).first().click().catch(() => {}); } catch (_) {}
          try { await page.locator('label').filter({ hasText: 'I currently rent' }).first().click().catch(() => {}); } catch (_) {}
          try { await page.locator('#visualRadioGroupV2-3 label').filter({ hasText: 'No' }).first().click().catch(() => {}); } catch (_) {}

          // visualRadioGroupV2-4: pergunta sobre ter seguro atual
          // Decidir entre Yes/No com base em campos comuns do `data`
          try {
            const insuranceCandidates = [
              data.hasInsurance,
              data.has_insurance,
              data.tempoDeSeguro,
              data.tempo_de_seguro,
              data.insurance,
              data.current_insurance,
              data.tenho_seguro,
              data.insured
            ];
            const raw = String((insuranceCandidates.find(Boolean) || '')).toLowerCase();
            const isNo = /^(no|false|none|nunca|never|não)$/.test(raw) || /nunca|never|no|none/.test(raw);
            const isYes = /^(yes|true|sim)$/.test(raw) || /yes|sim|true/.test(raw) || (/\d/.test(raw) && !/0/.test(raw));

            if (isYes) {
              try { await page.locator('#visualRadioGroupV2-4 label').filter({ hasText: 'Yes' }).first().click().catch(() => {}); } catch (_) {}
            } else if (isNo) {
              try { await page.locator('#visualRadioGroupV2-4 label').filter({ hasText: 'No' }).first().click().catch(() => {}); } catch (_) {}
            } else {
              // fallback: if there is a labelled choice matching the quote's payload (e.g., 'Yes' present), prefer Yes
              try {
                const yesExists = (await page.locator('#visualRadioGroupV2-4 label').filter({ hasText: 'Yes' }).count()) > 0;
                const noExists = (await page.locator('#visualRadioGroupV2-4 label').filter({ hasText: 'No' }).count()) > 0;
                if (yesExists) await page.locator('#visualRadioGroupV2-4 label').filter({ hasText: 'Yes' }).first().click().catch(() => {});
                else if (noExists) await page.locator('#visualRadioGroupV2-4 label').filter({ hasText: 'No' }).first().click().catch(() => {});
              } catch (_) {}
            }
          } catch (_) {}

          const email = String(data.email || data.mail || '').trim() || `cliente@outlook.com`;
          try { await page.getByRole('textbox', { name: 'Email address' }).fill(email).catch(() => {}); } catch (_) {}
          try { const nextBtn3 = page.getByRole('button', { name: 'Next' }); if (await nextBtn3.count() > 0) await nextBtn3.first().click().catch(() => {}); } catch (_) {}

          const phone = String(data.phone || data.telefone || data.phoneNumber || data.phone_number || '').trim() || this.generateUsPhone();
          try { await page.getByRole('textbox', { name: 'Phone number' }).click({ timeout: 5000 }).catch(() => {}); } catch (_) {}
          try { await page.getByRole('textbox', { name: 'Phone number' }).fill(phone).catch(() => {}); } catch (_) {}
          try { const nextBtn4 = page.getByRole('button', { name: 'Next' }); if (await nextBtn4.count() > 0) await nextBtn4.first().click().catch(() => {}); } catch (_) {}

          try { await page.locator('#visualRadioGroupV2-5 label').filter({ hasText: 'No' }).first().click().catch(() => {}); } catch (_) {}
          try { const saveBtn = page.getByRole('button', { name: 'Save and continue' }); if (await saveBtn.count() > 0) await saveBtn.first().click().catch(() => {}); } catch (_) {}

          try {
            const vehiclesRaw = Array.isArray(data.veiculos) ? data.veiculos : [];
            const fallbackVehicle = data.veiculo || data.vehicle || {};
            const vehicles = vehiclesRaw.length > 0 ? vehiclesRaw : [fallbackVehicle];

            for (let idx = 0; idx < vehicles.length; idx++) {
              const vehicle = vehicles[idx] || {};
              const vin = String(vehicle.vin || vehicle.VIN || vehicle.numero_chassi || data.vin || '').trim();
              const financeRaw = String(vehicle.financiado || data.financiado || vehicle.estado || vehicle.payment_status || '').toLowerCase();
              const isFinanced = /financi|finance|payments|paying/.test(financeRaw) && !/quitad|paid|own/.test(financeRaw);

              const tenureRaw = String(vehicle.tempo_com_veiculo || data.tempo_com_veiculo || data.tempoComVeiculo || '').toLowerCase();
              const currentYear = new Date().getFullYear();
              let purchaseYear = currentYear;
              if (/menos de 1|less than 1|< ?1/.test(tenureRaw)) {
                purchaseYear = currentYear;
              } else if (/1-3|1\/3|1 a 3|1\s*3|1 to 3/.test(tenureRaw)) {
                purchaseYear = currentYear - 2;
              } else if (/3-5|3\/5|3 a 5|3\s*5|3 to 5/.test(tenureRaw)) {
                purchaseYear = currentYear - 4;
              } else if (/5\+|5 or more|5\s*\+/.test(tenureRaw)) {
                purchaseYear = currentYear - 5;
              }

              try { await page.getByTestId('Vin Input').click({ timeout: 8000 }).catch(() => {}); } catch (_) {}
              if (vin) {
                try { await page.getByTestId('Vin Input').fill(vin, { timeout: 8000 }).catch(() => {}); } catch (_) {}
                await page.waitForTimeout(5000);
              }
              try {
                const tenureQuestion = page.getByText('Have you had this vehicle for more than 30 days?', { exact: false });
                if ((await tenureQuestion.count()) > 0) {
                  const q = tenureQuestion.first();
                  const fieldset = q.locator('xpath=ancestor::fieldset[1]');
                  const section = q.locator('xpath=ancestor::section[1]');
                  const containerCandidates = [fieldset, section];
                  let clicked = false;
                  for (const container of containerCandidates) {
                    if ((await container.count()) > 0) {
                      try { await container.getByText('Yes', { exact: true }).first().click({ timeout: 2000 }); clicked = true; break; } catch (_) {}
                      try { await container.getByRole('button', { name: 'Yes' }).first().click({ timeout: 2000 }); clicked = true; break; } catch (_) {}
                    }
                  }
                  if (!clicked) {
                    const yesBtn = page.getByRole('button', { name: 'Yes' });
                    if ((await yesBtn.count()) > 0) await yesBtn.first().click({ timeout: 2000 }).catch(() => {});
                  }
                }
              } catch (_) {}

              try {
                if (isFinanced) {
                  await page.locator('span').filter({ hasText: 'Finance (making payments)' }).first().click().catch(() => {});
                } else {
                  await page.locator('span').filter({ hasText: 'Own (fully paid off)' }).first().click().catch(() => {});
                }
              } catch (_) {}

              try { await page.getByText('Yes').click().catch(() => {}); } catch (_) {}

              try {
                const yearField = page.getByRole('textbox', { name: 'Year you bought your vehicle' });
                await yearField.click({ timeout: 8000 }).catch(() => {});
                await yearField.fill(String(purchaseYear)).catch(() => {});
                try { await page.getByRole('button', { name: 'Next' }).click({ timeout: 8000 }).catch(() => {}); } catch (_) {}
                await page.locator('span').filter({ hasText: 'Yes' }).nth(2).click();
              } catch (_) {}

              try { await page.getByRole('button', { name: 'Next' }).click({ timeout: 8000 }).catch(() => {}); } catch (_) {}
              try { await page.getByLabel('Time period').selectOption('12').catch(() => {}); } catch (_) {}
              try {
                const milesField = page.getByRole('textbox', { name: 'Number of Miles' });
                await milesField.click({ timeout: 8000 }).catch(() => {});
                await milesField.fill('250').catch(() => {});
              } catch (_) {}

              try { await page.locator('#optInRideshare-radio').getByText('No').click().catch(() => {}); } catch (_) {}
              try { await page.getByRole('button', { name: 'Save and continue' }).click({ timeout: 8000 }).catch(() => {}); } catch (_) {}

              try { await page.getByTestId('modalConfirmationButton').click({ timeout: 8000 }).catch(() => {}); } catch (_) {}

              if (idx < vehicles.length - 1) {
                try { await page.getByRole('button', { name: 'Add another vehicle' }).click({ timeout: 8000 }).catch(() => {}); } catch (_) {}
                await page.waitForTimeout(1500);
              } else {
                try { await page.getByRole('button', { name: 'By continuing, you confirm' }).click({ timeout: 8000 }).catch(() => {}); } catch (_) {}
              }
            }

            // Driver info: marital status, gender, age licensed, student status
            try {
              const maritalCandidates = [
                data.maritalStatus,
                data.marital_status,
                data.estado_civil,
                data.estadoCivil,
                data.married,
                data.casado,
                data.isMarried
              ];
              const maritalRaw = String((maritalCandidates.find(Boolean) || '')).toLowerCase();
              const isMarried = /married|casad/.test(maritalRaw) && !/single|solteir/.test(maritalRaw);

              if (isMarried) {
                try { await page.getByText('Yes').click({ timeout: 5000 }).catch(() => {}); } catch (_) {}
              } else {
                try { await page.getByText('No').click({ timeout: 5000 }).catch(() => {}); } catch (_) {}
              }

              const genderCandidates = [data.gender, data.genero, data.sexo];
              const genderRaw = String((genderCandidates.find(Boolean) || '')).toLowerCase();
              const isFemale = /fem/i.test(genderRaw) || /woman|mulher/.test(genderRaw);
              if (isFemale) {
                try { await page.getByText('Female').click({ timeout: 5000 }).catch(() => {}); } catch (_) {}
              } else {
                try { await page.getByText('Male', { exact: true }).click({ timeout: 5000 }).catch(() => {}); } catch (_) {}
              }

              const ageLicensed = String(data.ageFirstLicensed || data.idadeHabilitado || data.ageLicensed || 18);
              try { await page.getByRole('textbox', { name: 'Age first licensed' }).click({ timeout: 5000 }).catch(() => {}); } catch (_) {}
              try { await page.getByRole('textbox', { name: 'Age first licensed' }).fill(ageLicensed).catch(() => {}); } catch (_) {}

              try { await page.locator('#goodStudent-radio').getByText('No').click({ timeout: 5000 }).catch(() => {}); } catch (_) {}

              try { await page.getByRole('button', { name: 'Save and continue' }).click({ timeout: 8000 }).catch(() => {}); } catch (_) {}
            } catch (driverErr) {
              console.warn('[Liberty] driver step failed:', driverErr?.message || driverErr);
            }
          } catch (vehicleErr) {
            console.warn('[Liberty] vehicle step failed:', vehicleErr?.message || vehicleErr);
          }
          
        } catch (flowErr) {
          console.warn('[Liberty] fluxo adicional falhou:', flowErr?.message || flowErr);
        }


        // If requested, pause again at the end so the user can inspect next buttons
        if (options.pause) {
          try {
            await page.pause();
          } catch (e) {
            console.warn('[Liberty] page.pause() failed (end):', e?.message || e);
          }
        }

        return { success: true };
    } catch (error) {
      return { success: false, error: error?.message || String(error) };
    } finally {
      const forceClose = options.forceClose === true;
      if (forceClose) await this.cleanup().catch(() => {});
    }
  }
}

module.exports = LibertyQuoteAutomation;
