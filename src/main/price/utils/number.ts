const NON_DIGIT_EXCEPTIONS = /[^0-9.\-]/g;

export function parseCurrency(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  let str = String(value)
    .replace(/\$/g, '')
    .replace(/R\$/gi, '')
    .replace(/\s+/g, '')
    .replace(/\u00a0/g, '')
    .trim();

  const commaCount = (str.match(/,/g) || []).length;
  const dotCount = (str.match(/\./g) || []).length;

  if (commaCount === 1 && dotCount === 0) {
    str = str.replace(',', '.');
  } else if (commaCount > 1) {
    // Remove thousands separators, keep decimal comma if present
    const lastComma = str.lastIndexOf(',');
    str = str
      .replace(/,/g, (_match, index) => (index === lastComma ? '.' : ''))
      .replace(/\./g, '');
  } else {
    str = str.replace(/,/g, '');
  }

  str = str.replace(NON_DIGIT_EXCEPTIONS, '');

  const parsed = Number.parseFloat(str);
  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

export function formatWithComma(value: number | string): string {
  const amount = Number.parseFloat(String(value));
  if (!Number.isFinite(amount)) {
    return '0.00';
  }

  const [integerPart, decimalPart] = amount.toFixed(2).split('.');
  if (integerPart.length > 3) {
    return `${integerPart[0]},${integerPart.slice(1)}.${decimalPart}`;
  }
  return `${integerPart}.${decimalPart}`;
}

export default {
  parseCurrency,
  formatWithComma
};
