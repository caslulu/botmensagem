const { chromium } = require('playwright');
const ChromeDetector = require('../../utils/chrome-detector');

class LibertyQuoteAutomation {
  constructor(options = {}) {
    this.headless = options.headless ?? false;
    this.browser = null;
    this.context = null;
    this.page = null;
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
      args: ['--incognito', '--disable-blink-features=AutomationControlled', '--no-sandbox']
    };

    const chromePath = ChromeDetector.detect();
    if (chromePath) launchOptions.executablePath = chromePath;

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

      // Wait a bit for navigation or results
      await page.waitForTimeout(3500);

      return { success: true };
    } catch (error) {
      return { success: false, error: error?.message || String(error) };
    } finally {
      // close unless user wants browser kept open
      const keep = options.keepBrowserOnError ?? false;
      if (!keep) await this.cleanup().catch(() => {});
    }
  }
}

module.exports = LibertyQuoteAutomation;
