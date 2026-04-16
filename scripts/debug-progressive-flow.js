const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ChromeDetector = require('../src/main/automation/utils/chrome-detector');

const OUTPUT_DIR = path.join(process.cwd(), 'tmp', 'progressive-debug');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

async function dumpVisibleControls(page, stage) {
  const filePath = path.join(OUTPUT_DIR, `${stage}-controls.json`);
  const data = await page.locator('input, select, textarea, button, a, [role]').evaluateAll((nodes) => {
    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };

    return nodes
      .filter((node) => node instanceof HTMLElement && isVisible(node))
      .map((node) => {
        const label =
          node.getAttribute('aria-label') ||
          node.getAttribute('placeholder') ||
          node.getAttribute('name') ||
          node.textContent ||
          '';

        return {
          tag: node.tagName.toLowerCase(),
          type: node.getAttribute('type') || '',
          role: node.getAttribute('role') || '',
          id: node.getAttribute('id') || '',
          name: node.getAttribute('name') || '',
          label: label.trim().replace(/\s+/g, ' ').slice(0, 200)
        };
      });
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

async function dumpPage(page, stage) {
  await page.screenshot({ path: path.join(OUTPUT_DIR, `${stage}.png`), fullPage: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, `${stage}.html`), await page.content());
  await dumpVisibleControls(page, stage);
}

async function clickIfVisible(locator) {
  try {
    if (await locator.isVisible({ timeout: 2000 })) {
      await locator.click({ timeout: 5000 });
      return true;
    }
  } catch (_) {
    // ignore
  }
  return false;
}

async function firstVisible(page, locators, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const build of locators) {
      try {
        const locator = build();
        if (await locator.isVisible()) {
          return locator;
        }
      } catch (_) {
        // ignore
      }
    }
    await page.waitForTimeout(250);
  }
  return null;
}

async function startQuoteFromHomepage(page, zipcode) {
  const quoteFlowSignals = [
    () => page.getByLabel('First Name', { exact: true }),
    () => page.getByLabel(/Primary email address/i),
    () => page.getByLabel(/Date of birth/i),
    () => page.getByRole('combobox', { name: 'Street number and name' }),
    () => page.getByRole('textbox', { name: /Street number and name/i }),
    () => page.getByRole('button', { name: /Ok, start my quote/i }),
    () => page.getByRole('button', { name: "No, I'll add my own" }),
    () => page.locator("input[name='VehiclesNew_embedded_questions_list_Vin']").first()
  ];

  const waitForQuoteFlow = async () => Boolean(await firstVisible(page, quoteFlowSignals, 15000));

  const homeZip = await firstVisible(page, [
    () => page.locator('#zipCode_mma'),
    () => page.locator("input[name='ZipCode']").first(),
    () => page.getByLabel('ZIP Code'),
    () => page.getByRole('textbox', { name: 'ZIP Code' })
  ], 5000);

  if (homeZip) {
    await homeZip.fill(zipcode);
    if (await clickIfVisible(page.locator('#qsButton_mma'))) {
      await page.waitForTimeout(4000);
      if (await waitForQuoteFlow()) {
        return true;
      }
    }
  }

  await clickIfVisible(page.locator("a:has-text('Or, see all products')").first());
  await clickIfVisible(page.locator("a:has-text('See all 30+ products')").first());
  await clickIfVisible(page.locator("a:has-text('Or, see all 30+ products')").first());

  await clickIfVisible(page.locator('#p-au'));
  await clickIfVisible(page.locator("button[data-value='AU']").first());
  await clickIfVisible(page.getByRole('option', { name: /^Auto$/i }));

  const overlayZip = await firstVisible(page, [
    () => page.locator('#zipCode_overlay'),
    () => page.locator('#zipCode_overlay_subproducts'),
    () => page.getByLabel('Enter ZIP Code'),
    () => page.getByRole('textbox', { name: 'Enter ZIP Code' })
  ], 5000);

  if (!overlayZip) {
    return false;
  }

  await overlayZip.fill(zipcode);
  await clickIfVisible(page.locator('#qsButton_overlay'));
  await clickIfVisible(page.locator('#qsButton_overlay_subproducts'));
  await clickIfVisible(page.locator("input[type='submit'][id='qsButton_overlay']").first());
  await clickIfVisible(page.locator("input[type='submit'][id='qsButton_overlay_subproducts']").first());
  await page.waitForTimeout(4000);
  return waitForQuoteFlow();
}

async function main() {
  ensureDir(OUTPUT_DIR);

  const sample = {
    firstName: 'Tomas',
    lastName: 'Melo',
    email: 'tomasmelo6439@outlook.com',
    dataNascimentoUs: '07/01/1971',
    zipcode: '75034',
    rua: '6481 cobbie creek dr',
    cidade: 'Frisco',
    vin: 'JM1BPANM2K1135662'
  };

  const launchOptions = {
    headless: true,
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
    launchOptions.executablePath = chromePath;
  }

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('https://www.progressive.com/', { waitUntil: 'load', timeout: 60000 });
    await dumpPage(page, '00-home');

    const enteredFlow = await startQuoteFromHomepage(page, sample.zipcode);
    await dumpPage(page, '01-after-zip');

    if (!enteredFlow) {
      throw new Error('Nao foi possivel entrar no fluxo atual da Progressive.');
    }

    const basicInput = await firstVisible(page, [
      () => page.getByLabel('First Name', { exact: true }),
      () => page.getByLabel(/Primary email address/i),
      () => page.getByLabel(/Date of birth/i)
    ]);

    if (basicInput) {
      await page.getByLabel('First Name', { exact: true }).fill(sample.firstName);
      await page.getByLabel('Last Name', { exact: true }).fill(sample.lastName);
      await page.getByLabel(/Primary email address/i).fill(sample.email);
      await page.getByLabel(/Date of birth/i).fill(sample.dataNascimentoUs);
      await dumpPage(page, '02-basic-filled');

      const continueBtn = await firstVisible(page, [
        () => page.getByRole('button', { name: 'Continue' }),
        () => page.getByRole('button', { name: /Next/i })
      ]);
      if (continueBtn) {
        await continueBtn.click();
      }
    }

    await dumpPage(page, '03-after-basic');

    const addressInput = await firstVisible(page, [
      () => page.getByRole('combobox', { name: 'Street number and name' }),
      () => page.getByRole('textbox', { name: /Street number and name/i }),
      () => page.getByRole('textbox', { name: 'City' })
    ], 10000);

    if (addressInput) {
      try {
        await page.getByRole('combobox', { name: 'Street number and name' }).fill(sample.rua);
      } catch (_) {
        await page.getByRole('textbox', { name: /Street number and name/i }).fill(sample.rua);
      }
      await page.getByRole('textbox', { name: 'City' }).fill(sample.cidade);
      await dumpPage(page, '04-address-filled');

      const startQuoteBtn = await firstVisible(page, [
        () => page.getByRole('button', { name: /Ok, start my quote/i }),
        () => page.getByRole('button', { name: /start my quote/i }),
        () => page.getByRole('button', { name: /Continue/i })
      ], 8000);

      if (startQuoteBtn) {
        await startQuoteBtn.click();
      }
    }

    await dumpPage(page, '05-after-address');

    const vehicleInput = await firstVisible(page, [
      () => page.getByRole('button', { name: /No, I'll add my own/i }),
      () => page.locator("a:has-text('Enter by VIN')").first(),
      () => page.locator("input[name='VehiclesNew_embedded_questions_list_Vin']").first(),
      () => page.getByRole('button', { name: /\+Add another vehicle/i })
    ], 15000);

    if (vehicleInput) {
      await clickIfVisible(page.getByRole('button', { name: /No, I'll add my own/i }));
      await clickIfVisible(page.locator("a:has-text('Enter by VIN')").first());
      const vinField = await firstVisible(page, [
        () => page.locator("input[name='VehiclesNew_embedded_questions_list_Vin']").first(),
        () => page.getByRole('textbox', { name: /VIN/i })
      ], 10000);
      if (vinField) {
        await vinField.fill(sample.vin);
      }
      await dumpPage(page, '06-vehicle-stage');
    }

    console.log(`Debug artifacts written to ${OUTPUT_DIR}`);
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
