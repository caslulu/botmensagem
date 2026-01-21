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

            // Additional drivers loop
            try {
              const driversList = (Array.isArray(data.drivers) ? data.drivers : (Array.isArray(data.motoristas) ? data.motoristas : []));
              const additionalDrivers = driversList.slice(1); // Skip primary

              for (const driver of additionalDrivers) {
                const rel = String(driver.relationship || driver.parentesco || '').toLowerCase();
                const isSpouse = /spouse|wife|esposa|conjuge/.test(rel);
                if (isSpouse) continue;

                try {
                  await page.getByRole('button', { name: 'Add another driver' }).click({ timeout: 5000 });
                } catch (e) {
                  continue; 
                }

                await page.waitForTimeout(1000);
                
                const dFirst = String(driver.firstName || driver.nome || '').trim();
                const dLast = String(driver.lastName || driver.sobrenome || '').trim();
                const dBirthday = String(driver.birthday || driver.dataNascimento || driver.dob || '').trim();

                if (dFirst) {
                  await page.getByRole('textbox', { name: 'First name' }).click().catch(() => {});
                  await page.getByRole('textbox', { name: 'First name' }).fill(dFirst).catch(() => {});
                }
                if (dLast) {
                  await page.getByRole('textbox', { name: 'Last name' }).click().catch(() => {});
                  await page.getByRole('textbox', { name: 'Last name' }).fill(dLast).catch(() => {});
                }
                if (dBirthday) {
                  await page.getByRole('textbox', { name: 'Birthday (MM/DD/YYYY)' }).click().catch(() => {});
                  await page.getByRole('textbox', { name: 'Birthday (MM/DD/YYYY)' }).fill(dBirthday).catch(() => {});
                }

                await page.getByRole('button', { name: 'Next' }).click().catch(() => {});
                await page.waitForTimeout(1000);

                let relText = 'Other';
                if (/son|filho/i.test(rel)) relText = 'Son';
                else if (/daughter|filha/i.test(rel)) relText = 'Daughter';
                else if (/husband|marido/i.test(rel)) relText = 'Husband'; 
                
                try {
                   await page.getByText(relText).first().click({ timeout: 2000 });
                } catch (_) {
                   await page.getByText('Other').first().click().catch(() => {});
                }
 
                try {
                   await page.getByLabel('License statusLicense status').selectOption('DRIVES_MY_VEHICLES').catch(() => {
                      return page.locator('select').filter({ hasText: /License/ }).first().selectOption('DRIVES_MY_VEHICLES');
                   });
                } catch (_) {}

                await page.getByText('No', { exact: true }).click().catch(() => {});
                
                await page.getByRole('textbox', { name: 'Age first licensed' }).click().catch(() => {});
                await page.getByRole('textbox', { name: 'Age first licensed' }).fill('18').catch(() => {});
                
                try { await page.locator('#goodStudent-radio').getByText('No').click().catch(() => {}); } catch (_) {}
                try { await page.locator('#studentAway-radio').getByText('No').click().catch(() => {}); } catch (_) {}

                await page.getByRole('button', { name: 'Save and continue' }).click({ timeout: 8000 }).catch(() => {});
                await page.waitForTimeout(1500);
              }
            } catch (addDriverErr) {
              console.warn('[Liberty] Error inside additional driver flow:', addDriverErr);
            }

            // Transition from Drivers to History - Click Save and continue on driver recap screen
            await page.getByRole('button', { name: 'Save and continue' }).click({ timeout: 8000 }).catch(() => {});

            // Spouse flow - If married, after clicking Save and continue on driver recap, fill spouse information
            if (isMarried) {
              try {
                await page.waitForTimeout(1500);

                // Get spouse name from nomeConjuge field (from data-mapper)
                const spouseFullName = String(data.nomeConjuge || data.nome_conjuge || '').trim();
                let spouseFirst = '';
                let spouseLast = '';
                
                if (spouseFullName) {
                  const nameParts = spouseFullName.split(/\s+/).filter(Boolean);
                  spouseFirst = nameParts[0] || '';
                  spouseLast = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
                }

                // Fallback: try to find spouse in drivers list or dedicated spouse field
                if (!spouseFirst) {
                  const spouseDriversList = (Array.isArray(data.drivers) ? data.drivers : (Array.isArray(data.motoristas) ? data.motoristas : []));
                  const spouseDriver = spouseDriversList.find(d => {
                    const rel = String(d.relationship || d.parentesco || '').toLowerCase();
                    return /spouse|wife|husband|esposa|marido|conjuge/.test(rel);
                  });

                  const spouseData = spouseDriver || data.spouse || data.conjuge || {};
                  spouseFirst = String(spouseData.firstName || spouseData.nome || spouseData.first_name || '').trim();
                  spouseLast = String(spouseData.lastName || spouseData.sobrenome || spouseData.last_name || '').trim();
                }
                
                // Get spouse birthday - prioritize US format
                const spouseBirthday = String(data.dataNascimentoConjugeUs || data.dataNascimentoConjuge || data.data_nascimento_conjuge || '').trim();

                console.log('[Liberty] Spouse data:', { spouseFirst, spouseLast, spouseBirthday });

                // Fill spouse first name
                const firstNameField = page.getByRole('textbox', { name: 'First name' });
                await firstNameField.click({ timeout: 5000 }).catch(() => {});
                if (spouseFirst) {
                  await firstNameField.fill(spouseFirst).catch(() => {});
                }

                // Fill spouse last name
                const lastNameField = page.getByRole('textbox', { name: 'Last name' });
                await lastNameField.click({ timeout: 5000 }).catch(() => {});
                if (spouseLast) {
                  await lastNameField.fill(spouseLast).catch(() => {});
                }

                // Fill spouse birthday
                const birthdayField = page.getByRole('textbox', { name: 'Birthday (MM/DD/YYYY)' });
                await birthdayField.click({ timeout: 5000 }).catch(() => {});
                if (spouseBirthday) {
                  await birthdayField.type(spouseBirthday, { delay: 100 }).catch(() => {});
                }

                // Click Next to proceed to relationship selection
                await page.getByRole('button', { name: 'Next' }).click().catch(() => {});
                await page.waitForTimeout(1000);

                // Select spouse relationship based on primary driver's gender
                // If primary is male, spouse is Wife; if primary is female, spouse is Husband
                if (isFemale) {
                  await page.getByText('Husband').click({ timeout: 3000 }).catch(() => {});
                } else {
                  await page.getByText('Wife').click({ timeout: 3000 }).catch(() => {});
                }

                // License status
                try {
                  await page.getByLabel('License statusLicense status').selectOption('DRIVES_MY_VEHICLES').catch(() => {
                    return page.locator('select').filter({ hasText: /License/ }).first().selectOption('DRIVES_MY_VEHICLES');
                  });
                } catch (_) {}

                // Answer No to the question (e.g., license suspended)
                await page.getByText('No', { exact: true }).click().catch(() => {});

                // Age first licensed for spouse - default to 18
                await page.getByRole('textbox', { name: 'Age first licensed' }).click().catch(() => {});
                await page.getByRole('textbox', { name: 'Age first licensed' }).fill('18').catch(() => {});

                // Good student - No
                try { await page.locator('#goodStudent-radio').getByText('No').click().catch(() => {}); } catch (_) {}
                // Student away - No
                try { await page.locator('#studentAway-radio').getByText('No').click().catch(() => {}); } catch (_) {}

                // Save and continue after spouse info
                await page.getByRole('button', { name: 'Save and continue' }).click({ timeout: 8000 }).catch(() => {});
                await page.waitForTimeout(1500);

                // Click Save and continue on driver recap screen to proceed
                await page.getByRole('button', { name: 'Save and continue' }).click({ timeout: 8000 }).catch(() => {});

              } catch (spouseErr) {
                console.warn('[Liberty] Error in spouse flow:', spouseErr?.message || spouseErr);
              }
            }
            
            await page.waitForTimeout(2000);
            
            // Post-driver logic (Questions: History, Insurance, Violations)
            try {
              // 1. Initial "No" questions (e.g. License suspended, Owe premium)
              try { 
                // "Has any driver had license suspended...?" etc.
                const noBtn = page.getByText('No', { exact: true });
                if (await noBtn.count() > 0) await noBtn.first().click({ timeout: 2000 }).catch(() => {});
              } catch (_) {}

              try {
                await page.locator('#owePremiumPriorCarrierMA-radio').getByText('No').click({ timeout: 2000 }).catch(() => {});
              } catch (_) {}

              // 2. Current Insurance Logic
              let hasInsurance = false;
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
                hasInsurance = /^(yes|true|sim)$/.test(raw) || /yes|sim|true/.test(raw) || (/\d/.test(raw) && !/0/.test(raw));
              } catch(_) {}

              if (hasInsurance) {
                 await page.locator('#autoPolicyIndicator-radio').getByText('Yes').click({ timeout: 5000 }).catch(() => {});
                 
                 // Calculate previous insurance date
                 const tenureRaw = String(data.tempoDeSeguro || data.insurance_tenure || data.time_insured || '1').toLowerCase();
                 let yearsToSubtract = 1; // Default
                 
                 // "1-3 years" -> 3. "3-5" -> 5. "5+" -> 5.
                 if (/3\s*[-to]\s*5/.test(tenureRaw) || /3\s*a\s*5/.test(tenureRaw)) yearsToSubtract = 5;
                 else if (/1\s*[-to]\s*3/.test(tenureRaw) || /1\s*a\s*3/.test(tenureRaw)) yearsToSubtract = 3;
                 else if (/5\s*(\+|plus|more|mais)/.test(tenureRaw)) yearsToSubtract = 5;
                 else if (/less|menos/.test(tenureRaw)) yearsToSubtract = 0; // Handled as 6mo

                 const d = new Date();
                 if (yearsToSubtract === 0) {
                    d.setMonth(d.getMonth() - 6);
                 } else {
                    d.setFullYear(d.getFullYear() - yearsToSubtract);
                 }
                 
                 const mm = String(d.getMonth() + 1).padStart(2, '0');
                 const yyyy = d.getFullYear();
                 const dateStr = `${mm}/${yyyy}`;

                 try {
                    await page.getByRole('textbox', { name: 'Date you first got insurance' }).click({ timeout: 5000 }).catch(() => {});
                    await page.getByRole('textbox', { name: 'Date you first got insurance' }).fill(dateStr).catch(() => {});
                 } catch (_) {}

                 console.log('[Liberty] Waiting 15s for manual liability fill...');
                 await page.getByRole('button', { name: 'Next' }).click();
                 await page.waitForTimeout(15000);
                  

              } else {
                 // No insurance flow
                 try { await page.locator('#autoPolicyIndicator-radio').getByText('No').click({ timeout: 5000 }).catch(() => {}); } catch (_) {}
                 try { await page.locator('#priorInsuranceHistory-radio').getByText('No').click({ timeout: 5000 }).catch(() => {}); } catch (_) {}
                 try { 
                    await page.getByLabel(/You may be required to/i).getByText('No', { exact: true }).click({ timeout: 5000 }).catch(() => {}); 
                 } catch (_) {}
              }

              // 3. Violations & Claims
              try { 
                await page.locator('#selfDisclosedViolationIndicator-radio').getByText('No', { exact: true }).click({ timeout: 5000 }).catch(() => {}); 
              } catch (_) {}
              
              try {
                // Try specific ID first, fallback to text
                const claimsGroup = page.locator('#selfDisclosedClaimIndicator-radio');
                if (await claimsGroup.count() > 0) {
                   await claimsGroup.getByText('No').first().click({ timeout: 2000 }).catch(() => {});
                } else {
                   // Fallback selector from user or generic
                   await page.locator('label:has-text("No")').last().click({ timeout: 2000 }).catch(() => {});
                }
              } catch (_) {}

              // 4. Save and Continue x2 (End of section)
              try { await page.getByRole('button', { name: 'Save and continue' }).first().click({ timeout: 10000 }).catch(() => {}); } catch (_) {}
              await page.waitForTimeout(3000);
              try { await page.getByRole('button', { name: 'Save and continue' }).first().click({ timeout: 10000 }).catch(() => {}); } catch (_) {}
              
              await page.waitForTimeout(2000);

              // Final questions (Education, etc)
              try {
                const diplomaText = page.getByText('High school diploma/equivalent');
                if (await diplomaText.count() > 0) {
                    await diplomaText.click().catch(() => {});
                } else {
                   // Fallback or try clicking a dropdown/combobox for education if needed
                }

                // Generic "No" for the subsequent question (often about affinity groups or other details)
                await page.getByText('No', { exact: true }).last().click().catch(() => {});
                
                await page.getByRole('button', { name: 'Save and continue' }).click({ timeout: 10000 }).catch(() => {});
              } catch (finalErr) {
                 console.warn('[Liberty] Error in final education/save step:', finalErr);
              }

            } catch (postDriverErr) {
              console.warn('[Liberty] Error in post-driver/history flow:', postDriverErr);
            }

            await page.pause();
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
