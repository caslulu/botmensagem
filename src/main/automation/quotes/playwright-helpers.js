function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveVisibleLocator(candidate) {
  if (!candidate) {
    return null;
  }

  const locator = typeof candidate === 'function' ? candidate() : candidate;
  if (!locator) {
    return null;
  }

  try {
    if (await locator.isVisible()) {
      return locator;
    }
  } catch (_) {
    // ignore and try strict-mode fallback below
  }

  try {
    if (typeof locator.first === 'function') {
      const first = locator.first();
      if (await first.isVisible()) {
        return first;
      }
    }
  } catch (_) {
    // ignore
  }

  return null;
}

async function firstVisible(candidates = []) {
  for (const candidate of candidates) {
    const locator = await resolveVisibleLocator(candidate);
    if (locator) {
      return locator;
    }
  }
  return null;
}

async function waitForAnyVisible(candidates = [], timeoutMs = 5000, pollMs = 250) {
  const timeout = Math.max(0, Number(timeoutMs) || 0) || 5000;
  const poll = Math.max(50, Number(pollMs) || 0) || 250;
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeout) {
    const locator = await firstVisible(candidates);
    if (locator) {
      return locator;
    }
    await wait(poll);
  }

  return null;
}

async function clickFirstVisible(candidates = [], options = {}) {
  const locator = await firstVisible(candidates);
  if (!locator) {
    return false;
  }
  await locator.click(options);
  return true;
}

async function checkFirstVisible(candidates = [], options = {}) {
  const locator = await firstVisible(candidates);
  if (!locator) {
    return false;
  }
  await locator.check(options);
  return true;
}

async function fillFirstVisible(candidates = [], value = '', options = {}) {
  const locator = await firstVisible(candidates);
  if (!locator) {
    return false;
  }

  try {
    await locator.click({ timeout: options.timeout ?? 5000 });
  } catch (_) {
    // ignore
  }

  await locator.fill(String(value), options);
  return true;
}

async function typeSequentiallyFirstVisible(candidates = [], value = '', options = {}) {
  const locator = await firstVisible(candidates);
  if (!locator) {
    return false;
  }

  const text = String(value ?? '');

  try {
    await locator.click({ timeout: options.timeout ?? 5000 });
  } catch (_) {
    // ignore
  }

  try {
    await locator.fill('');
  } catch (_) {
    // ignore
  }

  if (typeof locator.pressSequentially === 'function') {
    await locator.pressSequentially(text, { delay: options.delay ?? 100 });
  } else {
    await locator.fill(text);
  }

  return true;
}

async function selectFirstVisible(candidates = [], optionsToTry = []) {
  const locator = await firstVisible(candidates);
  if (!locator) {
    return false;
  }

  const attempts = Array.isArray(optionsToTry) ? optionsToTry : [optionsToTry];
  for (const option of attempts) {
    try {
      await locator.selectOption(option);
      return true;
    } catch (_) {
      // try next option candidate
    }
  }

  return false;
}

module.exports = {
  checkFirstVisible,
  clickFirstVisible,
  fillFirstVisible,
  firstVisible,
  resolveVisibleLocator,
  selectFirstVisible,
  typeSequentiallyFirstVisible,
  wait,
  waitForAnyVisible
};
