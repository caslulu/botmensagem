const { chromium } = require('playwright');
const { splitName, formatDateForUs } = require('../data-mapper');
const ChromeDetector = require('../../utils/chrome-detector');
const {
  STANDARD_QUOTE_DEFAULTS,
  isFinancedVehicle,
  mapInsuranceDuration,
  mapResidenceDuration,
  mapVehicleOwnership,
  isMarriedStatus,
  isMaleGender,
  isFemaleGender,
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

  async waitForProgressiveReflow(maxWait = 1800) {
    const timeout = Math.max(300, Number(maxWait) || 0) || 1800;

    await this.page.waitForTimeout(150).catch(() => {});

    await this.page.evaluate(({ quietMs, maxWaitMs }) => new Promise((resolve) => {
      if (!document.body) {
        resolve(false);
        return;
      }

      let settled = false;
      let quietTimer = null;
      let maxTimer = null;
      let observer = null;

      const finish = (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(quietTimer);
        clearTimeout(maxTimer);
        if (observer) observer.disconnect();
        resolve(value);
      };

      observer = new MutationObserver(() => {
        clearTimeout(quietTimer);
        quietTimer = setTimeout(() => finish(true), quietMs);
      });

      observer.observe(document.body, {
        attributes: true,
        childList: true,
        subtree: true,
        characterData: true
      });

      quietTimer = setTimeout(() => finish(true), quietMs);
      maxTimer = setTimeout(() => finish(false), maxWaitMs);
    }), { quietMs: 450, maxWaitMs: timeout }).catch(() => {});

    await this.waitForNetworkSettled(Math.min(timeout, 1200)).catch(() => {});
  }

  async locatorSelectionMatches(locator, optionsToTry = []) {
    if (!locator) {
      return false;
    }

    const attempts = Array.isArray(optionsToTry) ? optionsToTry : [optionsToTry];
    return locator.evaluate((element, rawAttempts) => {
      if (!element || element.tagName !== 'SELECT') {
        return false;
      }

      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const selected = element.selectedOptions?.[0] || null;
      const selectedValue = normalize(element.value);
      const selectedText = normalize(selected?.textContent);
      const selectedIndex = element.selectedIndex;

      return rawAttempts.some((attempt) => {
        if (attempt == null) {
          return false;
        }

        if (typeof attempt === 'string') {
          return selectedValue === attempt || selectedText === attempt;
        }

        if (typeof attempt === 'number') {
          return selectedIndex === attempt;
        }

        if (typeof attempt === 'object') {
          if (typeof attempt.index === 'number' && selectedIndex === attempt.index) {
            return true;
          }

          if (attempt.value != null && selectedValue === normalize(attempt.value)) {
            return true;
          }

          if (attempt.label != null && selectedText === normalize(attempt.label)) {
            return true;
          }
        }

        return false;
      });
    }, attempts).catch(() => false);
  }

  async selectFirstVisibleStable(candidates = [], optionsToTry = [], { attempts = 3, settleMs = 1800 } = {}) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const locator = await firstVisible(candidates);
      if (!locator) {
        return false;
      }

      if (await this.locatorSelectionMatches(locator, optionsToTry)) {
        return true;
      }

      const selected = await selectFirstVisible([() => locator], optionsToTry).catch(() => false);
      if (!selected) {
        continue;
      }

      await this.waitForProgressiveReflow(settleMs);

      if (await this.locatorSelectionMatches(locator, optionsToTry)) {
        return true;
      }
    }

    return false;
  }

  async visibleSelectionMatches(candidates = [], optionsToTry = []) {
    const locator = await firstVisible(candidates);
    if (!locator) {
      return false;
    }
    return this.locatorSelectionMatches(locator, optionsToTry);
  }

  async fillFirstVisibleStable(candidates = [], value = '', options = {}) {
    const expected = String(value ?? '');

    for (let attempt = 0; attempt < (options.attempts || 3); attempt += 1) {
      const locator = await firstVisible(candidates);
      if (!locator) {
        return false;
      }

      const current = await locator.inputValue({ timeout: 1500 }).catch(() => null);
      if (current === expected) {
        return true;
      }

      await fillFirstVisible([() => locator], expected, options).catch(() => false);
      await this.waitForProgressiveReflow(options.settleMs || 1200);

      const after = await locator.inputValue({ timeout: 1500 }).catch(() => null);
      if (after === expected) {
        return true;
      }
    }

    return false;
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

    for (let attempt = 0; attempt < 3; attempt += 1) {
      for (const pattern of patterns) {
        const group = await firstVisible([
          () => this.pickByPosition(this.page.getByRole('group', { name: pattern }), useLast),
          () => this.pickByPosition(this.page.getByLabel(pattern), useLast)
        ]);

        if (!group) {
          continue;
        }

        const radio = await firstVisible([
          () => group.getByLabel(answerText, { exact: true }),
          () => group.getByRole('radio', { name: answerText, exact: true })
        ]);

        if (radio) {
          const alreadyChecked = await radio.isChecked({ timeout: 1500 }).catch(() => false);
          if (alreadyChecked) {
            return true;
          }
        }

        const answered = radio
          ? await checkFirstVisible([() => radio], { force: true }).catch(() => false)
          : false;

        const clicked = answered
          ? false
          : await clickFirstVisible([
            () => group.getByText(new RegExp(`^${answerText}$`, 'i')).first()
          ], { force: true }).catch(() => false);

        if (answered || clicked) {
          await this.waitForProgressiveReflow(1600);
          const confirmed = await firstVisible([
            () => group.getByLabel(answerText, { exact: true }),
            () => group.getByRole('radio', { name: answerText, exact: true })
          ]);

          if (!confirmed || await confirmed.isChecked({ timeout: 1500 }).catch(() => true)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  async selecionarGenero(genero, { useLast = false } = {}) {
    const normalized = safeLower(genero);
    let option = 'Female';
    let optionValue = 'F';

    if (isMaleGender(normalized)) {
      option = 'Male';
      optionValue = 'M';
    } else if (/non.?binary|nao bin|não bin|^other$|outro/.test(normalized)) {
      option = 'Nonbinary';
      optionValue = 'N';
    } else if (isFemaleGender(normalized)) {
      option = 'Female';
      optionValue = 'F';
    }

    const optionPattern = new RegExp(`^${option}$`, 'i');

    const groupCandidates = [
      () => this.pickByPosition(this.page.getByRole('group', { name: /Gender/i }), useLast),
      () => this.pickByPosition(this.page.locator('fieldset').filter({ hasText: /Gender/i }), useLast),
      () => this.pickByPosition(this.page.locator('div').filter({ hasText: /Gender.*Male.*Female/i }), useLast)
    ];

    const checkAndConfirm = async (locator) => {
      if (!locator) {
        return false;
      }

      const alreadyChecked = await locator.isChecked({ timeout: 1500 }).catch(() => false);
      if (alreadyChecked) {
        return true;
      }

      try {
        await locator.check({ force: true, timeout: 5000 });
      } catch (_) {
        try {
          await locator.click({ force: true, timeout: 5000 });
        } catch (_) {
          return false;
        }
      }

      await this.waitForProgressiveReflow(1600);

      try {
        return await locator.isChecked({ timeout: 2000 });
      } catch (_) {
        return true;
      }
    };

    for (const groupCandidate of groupCandidates) {
      const group = await firstVisible([groupCandidate]);
      if (!group) {
        continue;
      }

      const radio = await firstVisible([
        () => group.getByRole('radio', { name: optionPattern }),
        () => group.getByLabel(optionPattern),
        () => group.locator(`input[type="radio"][value="${optionValue}"]`).first()
      ]);

      if (await checkAndConfirm(radio)) {
        return true;
      }
    }

    const directRadio = await firstVisible([
      () => this.pickByPosition(this.page.getByRole('radio', { name: optionPattern }), useLast),
      () => this.pickByPosition(this.page.getByLabel(optionPattern), useLast),
      () => this.pickByPosition(this.page.locator(`input[type="radio"][value="${optionValue}"]`), useLast),
      () => this.pickByPosition(this.page.locator(`input[type="radio"][value="${option}"]`), useLast)
    ]);

    if (await checkAndConfirm(directRadio)) {
      return true;
    }

    return this.page.evaluate(({ optionText, value, useLastSelection }) => {
      const normalize = (text) => String(text || '').replace(/\s+/g, ' ').trim();
      const optionPatternInPage = new RegExp(`^${optionText}$`, 'i');
      const genderPattern = /gender/i;

      const radioMatches = (radio) => {
        const label = radio.id ? document.querySelector(`label[for="${CSS.escape(radio.id)}"]`) : null;
        const surroundingLabel = radio.closest('label');
        const text = normalize([label?.textContent, surroundingLabel?.textContent, radio.getAttribute('aria-label')].filter(Boolean).join(' '));
        const radioValue = normalize(radio.value);
        return radioValue === value || optionPatternInPage.test(text);
      };

      const contextMatches = (radio) => {
        const context = radio.closest('fieldset, [role="group"], li, div');
        return genderPattern.test(normalize(context?.textContent)) || genderPattern.test(normalize(radio.name));
      };

      const radios = Array.from(document.querySelectorAll('input[type="radio"]')).filter((radio) => radioMatches(radio) && contextMatches(radio));
      const radio = useLastSelection ? radios.at(-1) : radios[0];
      if (!radio) {
        return false;
      }

      radio.click();
      radio.checked = true;
      radio.dispatchEvent(new Event('input', { bubbles: true }));
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      return radio.checked;
    }, { optionText: option, value: optionValue, useLastSelection: useLast }).catch(() => false);
  }

  async selecionarEstadoCivil(estadoCivil, { useLast = false } = {}) {
    const isMarried = isMarriedStatus(estadoCivil);
    const value = isMarried ? 'M' : 'S';
    const label = isMarried ? 'Married' : 'Single';

    return this.selectFirstVisibleStable([
      () => this.pickByPosition(this.page.getByLabel(/Marital status/i), useLast)
    ], [value, { label }, { index: isMarried ? 2 : 1 }]);
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

  async selecionarMaiorMonthsLicensed({ useLast = false } = {}) {
    const label = STANDARD_QUOTE_DEFAULTS.licenseMonthsOptionLabel;
    const selected = await this.selectFirstVisibleStable([
      () => this.pickByPosition(this.page.getByLabel('Months licensed*'), useLast),
      () => this.pickByPosition(this.page.getByLabel(/Months licensed/i), useLast),
      () => this.pickByPosition(this.page.getByRole('combobox', { name: /Months licensed/i }), useLast)
    ], [{ label }, label]).catch(() => false);

    if (selected) {
      return true;
    }

    return this.page.evaluate(({ useLastSelection, targetLabel }) => {
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const monthsPattern = /months\s+licensed/i;
      const targetPattern = new RegExp(targetLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

      const selects = Array.from(document.querySelectorAll('select')).filter((select) => {
        const context = normalize([
          select.getAttribute('aria-label'),
          select.getAttribute('name'),
          select.getAttribute('id'),
          select.labels ? Array.from(select.labels).map((item) => item.textContent).join(' ') : '',
          select.closest('fieldset, label, li, .field, .form-group, .questions-list, div')?.textContent
        ].filter(Boolean).join(' '));

        return monthsPattern.test(context);
      });

      const select = useLastSelection ? selects.at(-1) : selects[0];
      if (!select) {
        return false;
      }

      const options = Array.from(select.options || []).filter((option) => normalize(option.textContent) || normalize(option.value));
      const option = options.find((item) => targetPattern.test(normalize(item.textContent))) || options.at(-1);
      if (!option) {
        return false;
      }

      select.value = option.value;
      option.selected = true;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new Event('blur', { bubbles: true }));
      return true;
    }, { useLastSelection: useLast, targetLabel: label }).catch(() => false);
  }

  async preencherHistoricoLicencaPadrao({ estadoDocumento, useLast = false, ageFirstLicensed = STANDARD_QUOTE_DEFAULTS.ageFirstLicensed } = {}) {
    const isInternational = safeLower(estadoDocumento) === 'it';
    const licenseTypeCandidates = [
      () => this.pickByPosition(this.page.getByLabel('U.S. License type'), useLast)
    ];

    if (isInternational) {
      await this.selectFirstVisibleStable(licenseTypeCandidates, ['F', { index: 1 }]).catch(() => false);
      return;
    }

    await this.selectFirstVisibleStable(licenseTypeCandidates, [{ label: 'Personal' }, { index: 1 }]).catch(() => false);
    await this.selectFirstVisibleStable([
      () => this.pickByPosition(this.page.getByLabel('U.S. License status'), useLast)
    ], [{ label: 'Valid' }, { index: 1 }]).catch(() => false);

    await this.fillFirstVisibleStable([
      () => this.pickByPosition(this.page.getByLabel('Age first licensed*'), useLast),
      () => this.pickByPosition(this.page.getByLabel(/Age first licensed/i), useLast)
    ], ageFirstLicensed, { timeout: 5000 }).catch(() => false);

    await this.selectFirstVisibleStable([
      () => this.pickByPosition(this.page.getByLabel('Years licensed*'), useLast),
      () => this.pickByPosition(this.page.getByLabel(/Years licensed in the U\.S\. or/i), useLast),
      () => this.pickByPosition(this.page.getByLabel(/Years licensed/i), useLast)
    ], [STANDARD_QUOTE_DEFAULTS.licenseYearsOption, { index: 1 }]).catch(() => false);

    await this.selecionarMaiorMonthsLicensed({ useLast });

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

  async responderRadioPorPergunta(questionPattern, answerText) {
    const answeredByGroup = await this.answerChoiceInGroup([questionPattern], answerText).catch(() => false);
    if (answeredByGroup) {
      await this.waitForProgressiveReflow(1600);
      return true;
    }

    const answeredByDom = await this.page.evaluate(({ questionSource, answer }) => {
      const question = new RegExp(questionSource, 'i');
      const answerPattern = new RegExp(`^${answer}$`, 'i');
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();

      const roots = Array.from(document.querySelectorAll('fieldset, [role="group"], li, section, div'))
        .filter((element) => question.test(normalize(element.textContent)) && element.querySelectorAll('input[type="radio"]').length)
        .sort((a, b) => normalize(a.textContent).length - normalize(b.textContent).length);

      for (const root of roots) {
        const radios = Array.from(root.querySelectorAll('input[type="radio"]'));
        for (const radio of radios) {
          const label = radio.id ? document.querySelector(`label[for="${CSS.escape(radio.id)}"]`) : null;
          const surroundingLabel = radio.closest('label');
          const radioText = normalize([
            label?.textContent,
            surroundingLabel?.textContent,
            radio.getAttribute('aria-label'),
            radio.value
          ].filter(Boolean).join(' '));

          if (!answerPattern.test(radioText)) {
            continue;
          }

          radio.click();
          radio.checked = true;
          radio.dispatchEvent(new Event('input', { bubbles: true }));
          radio.dispatchEvent(new Event('change', { bubbles: true }));
          return radio.checked;
        }

        if (radios.length >= 2) {
          const fallbackRadio = /^no$/i.test(answer) ? radios[1] : radios[0];
          fallbackRadio.click();
          fallbackRadio.checked = true;
          fallbackRadio.dispatchEvent(new Event('input', { bubbles: true }));
          fallbackRadio.dispatchEvent(new Event('change', { bubbles: true }));
          return fallbackRadio.checked;
        }
      }

      return false;
    }, { questionSource: questionPattern.source, answer: answerText }).catch(() => false);

    if (answeredByDom) {
      await this.waitForProgressiveReflow(1600);
    }

    return answeredByDom;
  }

  async selecionarTempoSeguroAnterior(labelPatterns = [], option) {
    if (!option) {
      return false;
    }

    const labels = Array.isArray(labelPatterns) ? labelPatterns : [labelPatterns];
    const selected = await this.selectFirstVisibleStable(labels.map((labelPattern) => (
      () => this.page.getByLabel(labelPattern)
    )), [option, { index: 1 }]).catch(() => false);

    if (selected) {
      await this.waitForProgressiveReflow(1600);
      return true;
    }

    const selectedByDom = await this.page.evaluate(({ labelSources, targetValue }) => {
      const patterns = labelSources.map((source) => new RegExp(source, 'i'));
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();

      for (const select of Array.from(document.querySelectorAll('select'))) {
        const context = normalize([
          select.getAttribute('aria-label'),
          select.getAttribute('name'),
          select.getAttribute('id'),
          select.labels ? Array.from(select.labels).map((label) => label.textContent).join(' ') : '',
          select.closest('fieldset, label, li, .field, .form-group, .questions-list, div')?.textContent
        ].filter(Boolean).join(' '));

        if (!patterns.some((pattern) => pattern.test(context))) {
          continue;
        }

        const options = Array.from(select.options || []);
        const option = options.find((item) => item.value === targetValue) || options[1];
        if (!option) {
          continue;
        }

        select.value = option.value;
        option.selected = true;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        select.dispatchEvent(new Event('blur', { bubbles: true }));
        return true;
      }

      return false;
    }, {
      labelSources: labels.map((label) => label.source || String(label)),
      targetValue: option
    }).then(async (done) => {
      if (done) {
        await this.waitForProgressiveReflow(1600);
      }
      return done;
    }).catch(() => false);

    return selectedByDom;
  }

  async selecionarMenorAnnualMileage() {
    const annualMileageText = STANDARD_QUOTE_DEFAULTS.annualMileageText;
    const annualMileageBucket = STANDARD_QUOTE_DEFAULTS.annualMileageBucket;
    const annualMileageBucketPattern = /0\s*[-\u2013]\s*3,?999/i;

    const selectedByKnownLabel = await this.page
      .getByLabel('Learn more aboutAnnual')
      .selectOption(annualMileageBucket, { timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    if (selectedByKnownLabel) {
      await this.waitForProgressiveReflow(1500);
      return true;
    }

    const selectedByDom = await this.page.evaluate(() => {
      const wantedPattern = /0\s*[-\u2013]\s*3,?999/i;
      const annualMileagePattern = /annual\s+mileage/i;
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();

      const getSelectContext = (select) => {
        const parts = [];
        if (select.id) {
          const label = document.querySelector(`label[for="${CSS.escape(select.id)}"]`);
          parts.push(label?.textContent);
        }
        parts.push(select.getAttribute('aria-label'));
        parts.push(select.getAttribute('name'));
        parts.push(select.getAttribute('id'));
        parts.push(select.labels ? Array.from(select.labels).map((label) => label.textContent).join(' ') : '');

        const field = select.closest('fieldset, label, li, .field, .form-group, .questions-list, div');
        parts.push(field?.textContent);

        return normalize(parts.filter(Boolean).join(' '));
      };

      for (const select of Array.from(document.querySelectorAll('select'))) {
        const options = Array.from(select.options || []);
        const wantedOption = options.find((option) => wantedPattern.test(normalize(option.textContent)));
        if (!wantedOption) {
          continue;
        }

        const context = getSelectContext(select);
        if (!annualMileagePattern.test(context) && !annualMileagePattern.test(normalize(select.outerHTML))) {
          continue;
        }

        select.value = wantedOption.value;
        wantedOption.selected = true;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        select.dispatchEvent(new Event('blur', { bubbles: true }));
        return wantedPattern.test(normalize(select.selectedOptions?.[0]?.textContent));
      }

      return false;
    }).catch(() => false);

    if (selectedByDom) {
      await this.waitForProgressiveReflow(1500);
      return true;
    }

    const visibleSelectCandidates = [
      () => this.page.getByRole('combobox', { name: /Annual mileage/i }),
      () => this.page.getByLabel(/Annual mileage/i),
      () => this.page.getByLabel('Learn more aboutAnnual')
    ];

    const selectedByPlaywright = await selectFirstVisible(visibleSelectCandidates, [
      { label: annualMileageBucket },
      annualMileageBucket
    ]).catch(() => false);

    if (selectedByPlaywright) {
      await this.waitForProgressiveReflow(1500);
      return true;
    }

    const typed = await fillFirstVisible([
      () => this.page.getByRole('textbox', { name: 'Estimated annual mileage' }),
      () => this.page.getByRole('textbox', { name: /Annual mileage|Number of Miles/i }),
      () => this.page.locator("input[name*='AnnualMileage' i]").first(),
      () => this.page.locator("input[id*='AnnualMileage' i]").first(),
      () => this.page.locator("input[name*='Mileage' i]").first(),
      () => this.page.locator("input[id*='Mileage' i]").first()
    ], annualMileageText).catch(() => false);

    if (typed) {
      return true;
    }

    const dropdown = await firstVisible([
      () => this.page.getByRole('combobox', { name: /Annual mileage/i }),
      () => this.page.getByLabel(/Annual mileage/i),
      () => this.page.getByText(/Annual mileage/i).locator('xpath=..').first()
    ]);

    if (!dropdown) {
      return false;
    }

    try {
      await dropdown.click({ timeout: 3000 });
    } catch (_) {
      return false;
    }

    return clickFirstVisible([
      () => this.page.getByRole('option', { name: annualMileageBucketPattern }).first(),
      () => this.page.getByRole('menuitem', { name: annualMileageBucketPattern }).first(),
      () => this.page.getByText(annualMileageBucketPattern).first()
    ], { timeout: 3000 }).catch(() => false);
  }

  async annualMileageEstaPreenchido() {
    const annualMileageBucketPattern = /0\s*[-\u2013]\s*3,?999/i;

    return this.page.evaluate(() => {
      const wantedPattern = /0\s*[-\u2013]\s*3,?999/i;
      const annualMileagePattern = /annual\s+mileage/i;
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();

      for (const select of Array.from(document.querySelectorAll('select'))) {
        const context = normalize([
          select.getAttribute('aria-label'),
          select.getAttribute('name'),
          select.getAttribute('id'),
          select.labels ? Array.from(select.labels).map((label) => label.textContent).join(' ') : '',
          select.closest('fieldset, label, li, .field, .form-group, .questions-list, div')?.textContent
        ].filter(Boolean).join(' '));

        if (!annualMileagePattern.test(context) && !annualMileagePattern.test(normalize(select.outerHTML))) {
          continue;
        }

        if (wantedPattern.test(normalize(select.selectedOptions?.[0]?.textContent))) {
          return true;
        }
      }

      return false;
    }).catch(async () => {
      const valueText = await this.page
        .getByLabel('Learn more aboutAnnual')
        .evaluate((select) => select?.selectedOptions?.[0]?.textContent || '')
        .catch(() => '');

      return annualMileageBucketPattern.test(String(valueText));
    });
  }

  async preencherCamposVeiculoPadrao(veiculo = {}) {
    const ownLeaseValue = isFinancedVehicle(veiculo.financiado) ? '2' : '3';
    const ownershipValue = mapVehicleOwnership(veiculo.tempo_com_veiculo);
    const primaryUseCandidates = [
      () => this.page.getByLabel('Learn more aboutPrimary use*'),
      () => this.page.getByLabel('Learn more aboutVehicle use*')
    ];
    const ownLeaseCandidates = [
      () => this.page.getByLabel('Own or lease?')
    ];
    const ownershipCandidates = [
      () => this.page.getByLabel(/How long have you had this vehicle/i)
    ];

    await waitForAnyVisible([
      ...primaryUseCandidates,
      () => this.page.getByRole('textbox', { name: /Estimated annual mileage|Number of Miles/i }),
      () => this.page.getByLabel(/Annual mileage/i),
      ...ownershipCandidates,
      ...ownLeaseCandidates
    ], 6000).catch(() => null);

    const applyVehicleFields = async () => {
      await this.selectFirstVisibleStable(primaryUseCandidates, ['1', { index: 1 }]).catch(() => false);
      await this.selectFirstVisibleStable(ownLeaseCandidates, [ownLeaseValue]).catch(() => false);
      await this.selectFirstVisibleStable(ownershipCandidates, [ownershipValue, { index: 1 }]).catch(() => false);
      await this.selecionarMenorAnnualMileage();
      await this.waitForProgressiveReflow(1500);
    };

    const vehicleFieldsAreStable = async () => (
      await this.visibleSelectionMatches(primaryUseCandidates, ['1', { index: 1 }])
      && await this.visibleSelectionMatches(ownLeaseCandidates, [ownLeaseValue])
      && await this.visibleSelectionMatches(ownershipCandidates, [ownershipValue, { index: 1 }])
      && await this.annualMileageEstaPreenchido()
    );

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await applyVehicleFields();
      if (await vehicleFieldsAreStable()) {
        return true;
      }
      await this.page.waitForTimeout(800).catch(() => {});
    }

    return vehicleFieldsAreStable();
  }

  async aguardarTelaInformacoesPessoais() {
    await waitForAnyVisible([
      () => this.page.getByRole('group', { name: /Gender/i }),
      () => this.page.getByLabel(/Marital status/i),
      () => this.page.getByLabel(/Highest level of education/i),
      () => this.page.locator('#DriversAddPniDetails_embedded_questions_list_Gender'),
      () => this.page.locator('#DriversAddPniDetails_embedded_questions_list_MaritalStatus')
    ], 20000).catch(() => null);
    await this.waitForNetworkSettled(1500);
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
      return;
    }

    this.isCleaningUp = true;
    
    let browserProcess = null;
    
    try {
      if (this.browser && typeof this.browser.process === 'function') {
        browserProcess = this.browser.process();
      }
    } catch (_) { /* ignore */ }

    try {
      if (this.page && !this.page.isClosed()) {
        this.page.removeAllListeners();
        await this.page.close().catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (e) { /* ignore */ }

    try {
      if (this.context) {
        this.context.removeAllListeners();
        await this.context.close().catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (e) { /* ignore */ }

    try {
      if (this.browser && this.browser.isConnected()) {
        this.browser.removeAllListeners();
        await this.browser.close().catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    } catch (e) { /* ignore */ }

    if (browserProcess && !browserProcess.killed) {
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
      launchOptions.executablePath = chromePath;
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
        this.cleanup().catch(() => {});
      });

      context.on('close', () => {
        this.cleanup().catch(() => {});
      });

      browser.on('disconnected', () => {
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
        generoConjuge: data.generoConjuge,
        estadoDocumentoConjuge: data.estadoDocumentoConjuge,
        pessoasExtras,
        titularNome: `${data.firstName} ${data.lastName}`
      });

      await this.informacoesSeguroAnterior({
        hasInsurance: data.hasInsurance,
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
    await this.waitForNetworkSettled(3000);

    const quoteFlowSignals = [
      () => this.page.getByLabel('First Name', { exact: true }),
      () => this.page.getByLabel(/Primary email address/i),
      () => this.page.getByLabel(/Date of birth/i),
      () => this.page.getByRole('combobox', { name: 'Street number and name' }),
      () => this.page.getByRole('textbox', { name: /Street number and name/i }),
      () => this.page.getByRole('button', { name: /Ok, start my quote/i }),
      () => this.page.getByRole('button', { name: "No, I'll add my own" }),
      () => this.page.locator("input[name='VehiclesNew_embedded_questions_list_Vin']").first()
    ];

    const waitForQuoteFlow = async () => {
      const nextStep = await waitForAnyVisible(quoteFlowSignals, 15000);
      return Boolean(nextStep);
    };

    const submitHomepageWidget = async () => {
      const zipFilled = await fillFirstVisible([
        () => this.page.locator('#zipCode_mma'),
        () => this.page.locator("input[name='ZipCode']").first(),
        () => this.page.getByLabel('ZIP Code'),
        () => this.page.getByRole('textbox', { name: 'ZIP Code' })
      ], zipcode, { timeout: 15000 }).catch(() => false);

      if (!zipFilled) {
        return false;
      }

      const clicked = await clickFirstVisible([
        () => this.page.locator('#qsButton_mma'),
        () => this.page.locator("input[type='submit'][id='qsButton_mma']"),
        () => this.page.getByRole('button', { name: 'Get a quote' }),
        () => this.page.locator("input[type='submit'][value='Get a quote']").first()
      ], { timeout: 15000 }).catch(() => false);

      if (!clicked) {
        return false;
      }

      await this.waitForNetworkSettled(4000);
      return waitForQuoteFlow();
    };

    const submitOverlayWidget = async () => {
      await clickFirstVisible([
        () => this.page.locator("a:has-text('Or, see all products')").first(),
        () => this.page.locator("a:has-text('See all 30+ products')").first(),
        () => this.page.locator("a:has-text('Or, see all 30+ products')").first(),
        () => this.page.getByRole('link', { name: /see all products/i }).first()
      ], { timeout: 8000 }).catch(() => false);

      await this.waitForNetworkSettled(1500);

      await clickFirstVisible([
        () => this.page.locator('#p-au'),
        () => this.page.locator("button[data-value='AU']").first(),
        () => this.page.getByRole('option', { name: /^Auto$/i }),
        () => this.page.getByRole('button', { name: /^Auto$/i })
      ], { timeout: 15000 }).catch(() => false);

      const zipFilled = await fillFirstVisible([
        () => this.page.locator('#zipCode_overlay'),
        () => this.page.locator('#zipCode_overlay_subproducts'),
        () => this.page.getByLabel('Enter ZIP Code'),
        () => this.page.getByRole('textbox', { name: 'Enter ZIP Code' })
      ], zipcode, { timeout: 15000 }).catch(() => false);

      if (!zipFilled) {
        return false;
      }

      const clicked = await clickFirstVisible([
        () => this.page.locator('#qsButton_overlay'),
        () => this.page.locator('#qsButton_overlay_subproducts'),
        () => this.page.locator("input[type='submit'][id='qsButton_overlay']").first(),
        () => this.page.locator("input[type='submit'][id='qsButton_overlay_subproducts']").first(),
        () => this.page.getByRole('button', { name: 'Get a quote' }),
        () => this.page.locator("input[type='submit'][value='Get a quote']").last()
      ], { timeout: 15000 }).catch(() => false);

      if (!clicked) {
        return false;
      }

      await this.waitForNetworkSettled(4000);
      return waitForQuoteFlow();
    };

    if (await submitHomepageWidget()) {
      return;
    }

    if (await submitOverlayWidget()) {
      return;
    }

    throw new Error('Nao foi possivel entrar no fluxo de cotacao atual da Progressive.');
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
      await this.page.waitForTimeout(7000);
      await this.preencherCamposVeiculoPadrao(veiculo);

      // Tenta salvar o veículo atual antes de prosseguir
      // Isso é crucial para voltar à lista de veículos e permitir adicionar o próximo
      try {
        const saved = await clickFirstVisible([
          () => this.page.getByRole('button', { name: /^Save vehicle$/i }),
          () => this.page.getByRole('button', { name: /^Done$/i })
        ], { timeout: 8000 }).catch(() => false);

        if (saved) {
          await this.waitForNetworkSettled(2000);
          await waitForAnyVisible([
            () => this.page.getByRole('button', { name: 'Continue' }),
            () => this.page.getByRole('button', { name: '+Add another vehicle' }),
            () => this.page.getByText(/vehicle/i)
          ], 10000).catch(() => null);
        }
      } catch (_) {
      }
    }
    await this.page.waitForTimeout(2000);
    
    // Se houver mais de um veículo, pode ser necessário clicar em "Continue" para sair da lista
    // Mas o loop já tratou de adicionar todos. Agora finalizamos a seção.
    await this.clickButton(
      this.page.getByRole('button', { name: 'Continue' }),
      { timeout: 20000 }
    );
    await this.aguardarTelaInformacoesPessoais();
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

  async finalizarSecaoDrivers() {
    const insuranceVisible = await waitForAnyVisible([
      () => this.page.getByText(/Tell us about your insurance/i),
      () => this.page.getByText(/Auto insurance history/i),
      () => this.page.getByRole('group', { name: /Do you have auto insurance/i })
    ], 1500).catch(() => null);

    if (insuranceVisible) {
      return true;
    }

    const clicked = await clickFirstVisible([
      () => this.page.getByRole('button', { name: /^Continue$/i }),
      () => this.page.locator("button:has-text('Continue')").last()
    ], { timeout: 12000 }).catch(() => false);

    if (!clicked) {
      return false;
    }

    await waitForAnyVisible([
      () => this.page.getByText(/Tell us about your insurance/i),
      () => this.page.getByText(/Auto insurance history/i),
      () => this.page.getByRole('group', { name: /Do you have auto insurance/i })
    ], 15000).catch(() => null);
    await this.waitForProgressiveReflow(1800);
    return true;
  }

  async reaplicarDadosPessoaisBasicos({ genero, estadoCivil, estadoDocumento, useLast = false, ageFirstLicensed = STANDARD_QUOTE_DEFAULTS.ageFirstLicensed } = {}) {
    await this.selecionarGenero(genero, { useLast }).catch(() => false);
    await this.selecionarEstadoCivil(estadoCivil, { useLast }).catch(() => false);

    const educationCandidates = [
      !useLast ? () => this.page.locator('#DriversAddPniDetails_embedded_questions_list_HighestLevelOfEducation') : null,
      () => this.pickByPosition(this.page.getByLabel(/Highest level of education/i), useLast)
    ].filter(Boolean);

    const employmentCandidates = [
      !useLast ? () => this.page.locator('#DriversAddPniDetails_embedded_questions_list_EmploymentStatus') : null,
      () => this.pickByPosition(this.page.getByLabel(/Employment status/i), useLast)
    ].filter(Boolean);

    const residenceCandidates = [
      () => this.pickByPosition(this.page.getByLabel('Primary residence*'), useLast),
      !useLast ? () => this.page.locator('#DriversAddPniDetails_embedded_questions_list_PrimaryResidence') : null
    ].filter(Boolean);

    await this.selectFirstVisibleStable(educationCandidates, [STANDARD_QUOTE_DEFAULTS.educationOption, { index: 1 }]).catch(() => false);
    await this.selectFirstVisibleStable(employmentCandidates, [STANDARD_QUOTE_DEFAULTS.employmentOption, { index: 1 }]).catch(() => false);

    await this.preencherOccupationPadrao({ useLast }).catch(() => false);

    await this.selectFirstVisibleStable(residenceCandidates, [STANDARD_QUOTE_DEFAULTS.primaryResidenceOption, { index: 1 }]).catch(() => false);

    await this.preencherHistoricoLicencaPadrao({
      estadoDocumento,
      useLast,
      ageFirstLicensed
    }).catch(() => false);
    await this.preencherPerguntasPadraoSemHistorico({ useLast }).catch(() => false);
  }

  async informacoesPessoais({ genero, estadoDocumento, estadoCivil, nomeConjuge, dataNascimentoConjuge, generoConjuge, estadoDocumentoConjuge, pessoasExtras }) {
    try {
      await this.selecionarGenero(genero);
    } catch (error) {
      console.warn('[ProgressiveAutomation] Falha ao selecionar gênero titular:', error?.message || error);
    }

    try {
      await this.selecionarEstadoCivil(estadoCivil);
    } catch (error) {
      console.warn('[ProgressiveAutomation] Falha ao selecionar estado civil:', error?.message || error);
    }

    try {
      await this.selectFirstVisibleStable([
        () => this.page.locator('#DriversAddPniDetails_embedded_questions_list_HighestLevelOfEducation'),
        () => this.page.getByLabel(/Highest level of education/i)
      ], [STANDARD_QUOTE_DEFAULTS.educationOption, { index: 1 }]);

      await this.selectFirstVisibleStable([
        () => this.page.locator('#DriversAddPniDetails_embedded_questions_list_EmploymentStatus'),
        () => this.page.getByLabel(/Employment status/i)
      ], [STANDARD_QUOTE_DEFAULTS.employmentOption, { index: 1 }]);

      await this.preencherOccupationPadrao();
    } catch (_) {
    }

    try {
      this.page.setDefaultTimeout(5000);
      await this.selectFirstVisibleStable([
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

      await this.reaplicarDadosPessoaisBasicos({
        genero,
        estadoCivil,
        estadoDocumento,
        ageFirstLicensed: STANDARD_QUOTE_DEFAULTS.ageFirstLicensed
      });

      await this.page.waitForTimeout(1000);
      await this.clickButton(
        this.page.getByRole('button', { name: 'Continue' }),
        { timeout: 20000 }
      );
    } catch (error) {
      console.warn('[ProgressiveAutomation] Falha ao preencher dados de licença do titular:', error?.message || error);
    }

    if (isMarriedStatus(estadoCivil) && nomeConjuge && dataNascimentoConjuge) {
      try {
        const [firstName, lastName] = splitName(nomeConjuge);
        await this.page.getByLabel('First Name').fill(firstName || 'Spouse');
        await this.page.getByLabel('Last Name').fill(lastName || '');
        await this.page.getByLabel('Date of birth').fill(dataNascimentoConjuge || '01/01/1990');

        const spouseGender = generoConjuge || (isFemaleGender(genero) ? 'male' : 'female');

        // Aguarda um pouco para garantir que a página carregou todos os elementos
        await this.page.waitForTimeout(1500);

        try {
          await this.selecionarGenero(spouseGender, { useLast: true });
          // Aguarda após selecionar gênero para evitar "unclick"
          await this.page.waitForTimeout(800);
          
        } catch (e) {
          console.warn('[Progressive] Erro ao selecionar gênero do cônjuge:', e.message);
        }

        try {
          await this.selectFirstVisibleStable([
            () => this.page.getByLabel(/Highest level of education/i).last()
          ], [STANDARD_QUOTE_DEFAULTS.educationOption, { index: 1 }]);

          await this.selectFirstVisibleStable([
            () => this.page.getByLabel('Employment status*').last(),
            () => this.page.getByLabel(/Employment status/i).last()
          ], [STANDARD_QUOTE_DEFAULTS.employmentOption, { index: 1 }]);

          await this.preencherOccupationPadrao({ useLast: true });
        } catch (e) {
          console.warn('Campos extras de emprego/educação (Cônjuge) não encontrados ou erro:', e.message);
        }

        try {
          await this.preencherHistoricoLicencaPadrao({
            estadoDocumento: estadoDocumentoConjuge || estadoDocumento,
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

          await this.selecionarGenero(pessoa.genero, { useLast: true });

          const nascimento = formatDateForUs(pessoa.data_nascimento) || '01/01/1990';
          await this.page.getByRole('textbox', { name: 'Date of birth' }).fill(nascimento);
          await this.selecionarEstadoCivil(pessoa.estado_civil || 'single', { useLast: true });
          await this.selectFirstVisibleStable([
            () => this.page.getByLabel('Relationship to', { exact: false }).last()
          ], ['O', { index: 1 }]);

          await this.preencherHistoricoLicencaPadrao({
            estadoDocumento: pessoa.documento_estado,
            useLast: true,
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

    await this.finalizarSecaoDrivers();
  }

  async informacoesSeguroAnterior({ hasInsurance: explicitHasInsurance, tempoDeSeguro, tempoNoEndereco }) {
    const insuranceDuration = mapInsuranceDuration(tempoDeSeguro);
    const hasInsurance = typeof explicitHasInsurance === 'boolean'
      ? explicitHasInsurance
      : Boolean(safeLower(tempoDeSeguro)) && insuranceDuration.hasInsurance;
    const option = insuranceDuration.option;

    try {
      await waitForAnyVisible([
        () => this.page.getByText(/Tell us about your insurance/i),
        () => this.page.getByText(/Auto insurance history/i),
        () => this.page.getByRole('group', { name: /auto insurance today/i }),
        () => this.page.getByRole('group', { name: /auto insurance/i }),
        () => this.page.getByLabel(/How long have you been with/i),
        () => this.page.getByLabel(/How long have you been with your current/i),
        () => this.page.getByLabel(/How long have you been with your most recent/i),
        () => this.page.getByRole('button', { name: 'Continue' })
      ], 15000).catch(() => null);

      if (!hasInsurance) {
        await this.page
          .getByRole('group', { name: 'Do you have auto insurance' })
          .getByLabel('No')
          .check({ timeout: 8000 });

        await waitForAnyVisible([
          () => this.page.getByText(/Have you had auto insurance in the last 31 days/i),
          () => this.page.getByRole('group', { name: /last 31 days/i })
        ], 8000).catch(() => null);
        await this.waitForProgressiveReflow(1600);

        await this.page
          .getByRole('group', { name: 'Have you had auto insurance in the last 31 days?' })
          .getByLabel('No')
          .check({ timeout: 8000 });
        await this.waitForProgressiveReflow(1600);

        await this.selecionarTempoSeguroAnterior([
          /How long have you been with your most recent auto insurance company/i,
          /Learn more aboutHow long have you been with your most recent/i,
          /most recent auto insurance company/i,
          /How long have you been with/i
        ], option).catch(() => false);
      } else {
        await this.page
          .getByRole('group', { name: 'Do you have auto insurance' })
          .getByLabel('Yes')
          .check({ timeout: 8000 });

        await waitForAnyVisible([
          () => this.page.getByLabel(/How long have you been with your current/i),
          () => this.page.getByLabel('How long have you been with'),
          () => this.page.getByText(/How long have you been with your current auto insurance company/i)
        ], 8000).catch(() => null);
        await this.waitForProgressiveReflow(1600);

        if (option) {
          await this.page
            .getByLabel('How long have you been with')
            .selectOption(option, { timeout: 8000 });
          await this.waitForProgressiveReflow(1600);

          if (option === 'A') {
            await waitForAnyVisible([
              () => this.page.getByRole('group', { name: /insured for the past 6 months/i }),
              () => this.page.getByText(/insured for the past 6 months/i)
            ], 8000).catch(() => null);

            await this.page
              .getByRole('group', { name: /insured for the past 6 months/i })
              .getByLabel('Yes')
              .check({ timeout: 8000 })
              .catch(() => this.responderRadioPorPergunta(/insured for the past 6 months/i, 'Yes'));
            await this.waitForProgressiveReflow(1600);
          }
        }
      }

      await this.answerChoiceInGroup([/Do you have non-auto policies/i, /non-auto policies/i], 'No');
      await this.answerChoiceInGroup([/Have you had auto insurance/i, /prior auto insurance/i], hasInsurance ? 'Yes' : 'No');

      try {
        const residenceOption = mapResidenceDuration(tempoNoEndereco);
        await this.selectFirstVisibleStable([
          () => this.page.getByLabel('How long have you lived at'),
          () => this.page.getByLabel(/How long have you lived at/i),
          () => this.page.getByRole('combobox', { name: /How long.*lived/i })
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
