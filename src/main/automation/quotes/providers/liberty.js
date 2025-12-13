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
    // Simple US-like phone number: (AAA) BBB-CCCC with non-zero area code
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
      // Ensure headed and devtools are enabled for inspection
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

      // Try the zip/quote flow (user provided selectors)
      const zipcode = String(data.zipcode || '').trim();
      if (!zipcode) {
        throw new Error('ZIP code not provided for Liberty automation');
      }

      // Click label if present then fill textbox by role
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

      // Click the primary button (user indicated 'Get my price')
      try {
        const btn = page.getByRole('button', { name: 'Get my price' });
        if (await btn.count() > 0) {
          await btn.first().click({ timeout: 10000 });
        } else {
          // try alternative button text
          await page.getByRole('button', { name: 'Get a quote' }).click({ timeout: 10000 }).catch(() => {});
        }
      } catch (_) {}

      console.log('Liberty automation completed initial steps.');
        // Wait a bit for navigation or results
        await page.waitForTimeout(3500);

        // Try to continue the flow by filling the common personal/address pages
        try {
            await page.pause()
          // Click any initial consent/ok button if present (retry a few times to allow render/animation)
          try {
            const okBtn = page.getByRole('button', { name: 'OK, thanks!' });
            for (let i = 0; i < 3; i++) {
              if ((await okBtn.count()) > 0) {
                const btn = okBtn.first();
                try {
                  await btn.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
                  await btn.click({ timeout: 4000 });
                  break;
                } catch (err) {
                  if (i === 2) throw err;
                  await page.waitForTimeout(500);
                }
              } else {
                await page.waitForTimeout(500);
              }
            }
          } catch (_) {}

          // Pause at the start of the name screen if requested, so user can inspect elements
          if (options.pause) {
            try { await page.pause(); } catch (e) { console.warn('[Liberty] page.pause() failed (name screen):', e?.message || e); }
          }

          const firstName = String(data.firstName || data.first_name || data.first || '').trim();
          const lastName = String(data.lastName || data.last_name || data.last || '').trim();
          const birthday = String(data.dataNascimentoUs || data.birthday || data.dob || '').trim() || '10/10/2000';

          if (firstName) await page.getByRole('textbox', { name: 'First name' }).fill(firstName).catch(() => {});
          if (lastName) await page.getByRole('textbox', { name: 'Last name' }).fill(lastName).catch(() => {});
          if (birthday) {
            try {
              const dobField = page.getByRole('textbox', { name: 'Birthday (MM/DD/YYYY)' });
              await dobField.click();
              // Use type instead of fill to work better with input masks
              await dobField.type(birthday, { delay: 100 });
            } catch (_) {}
          }

          // Click Next if available
          try {
            const nextBtn = page.getByRole('button', { name: 'Next' });
            if (await nextBtn.count() > 0) await nextBtn.first().click().catch(() => {});
          } catch (_) {}

          // Address fields
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

          // Select some radio options by visible text
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

          // Email
          const email = String(data.email || data.mail || '').trim() || `cliente@outlook.com`;
          try { await page.getByRole('textbox', { name: 'Email address' }).fill(email).catch(() => {}); } catch (_) {}
          try { const nextBtn3 = page.getByRole('button', { name: 'Next' }); if (await nextBtn3.count() > 0) await nextBtn3.first().click().catch(() => {}); } catch (_) {}

          // Phone
          const phone = String(data.phone || data.telefone || data.phoneNumber || data.phone_number || '').trim() || this.generateUsPhone();
          try { await page.getByRole('textbox', { name: 'Phone number' }).click({ timeout: 5000 }).catch(() => {}); } catch (_) {}
          try { await page.getByRole('textbox', { name: 'Phone number' }).fill(phone).catch(() => {}); } catch (_) {}
          try { const nextBtn4 = page.getByRole('button', { name: 'Next' }); if (await nextBtn4.count() > 0) await nextBtn4.first().click().catch(() => {}); } catch (_) {}

          // Additional radio and final save
          try { await page.locator('#visualRadioGroupV2-5 label').filter({ hasText: 'No' }).first().click().catch(() => {}); } catch (_) {}
          try { const saveBtn = page.getByRole('button', { name: 'Save and continue' }); if (await saveBtn.count() > 0) await saveBtn.first().click().catch(() => {}); } catch (_) {}
        } catch (flowErr) {
          console.warn('[Liberty] fluxo adicional falhou:', flowErr?.message || flowErr);
        }

        // If requested, pause the page so the user can interact and continue the flow manually
        if (options.pause) {
          try {
            await page.pause();
          } catch (e) {
            // ignore if pause is not available in this environment
            console.warn('[Liberty] page.pause() failed:', e?.message || e);
          }
          // keep browser open so user can inspect and continue manually
          return { success: true, paused: true };
        }

        return { success: true };
    } catch (error) {
      return { success: false, error: error?.message || String(error) };
    } finally {
      // close unless user wants browser kept open or requested a pause to inspect
      const keep = options.keepBrowserOnError ?? false;
      if (!keep && !options.pause) await this.cleanup().catch(() => {});
    }
  }
}

module.exports = LibertyQuoteAutomation;
