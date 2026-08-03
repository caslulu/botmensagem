const STANDARD_QUOTE_DEFAULTS = Object.freeze({
  annualMileageText: '3000',
  annualMileageBucket: '0 - 3,999',
  libertyMinimumMiles: '250',
  occupationSearch: 'worker',
  educationOption: '2',
  employmentOption: 'EM',
  primaryResidenceOption: 'T',
  licenseYearsOption: '3',
  licenseMonthsOptionLabel: 'At least 36 months (3 years)',
  ageFirstLicensed: '16',
  spouseAgeFirstLicensed: '18',
  timePeriodMonths: '12'
});

function safeLower(value) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function includesAny(value, terms = []) {
  const normalized = safeLower(value);
  return terms.some((term) => normalized.includes(term));
}

function mapVehicleOwnership(value) {
  const normalized = safeLower(value);
  if (!normalized) return 'E';
  if (includesAny(normalized, ['less', 'menos', 'less than 1', '1 month'])) return 'E';
  if (includesAny(normalized, ['1 month - 1 year', '1 ano', '1 - 3', '1-3'])) return 'A';
  if (includesAny(normalized, ['1 year - 3 years', '1-3 years'])) return 'B';
  if (includesAny(normalized, ['3 years - 5 years', '3-5 years', '3-5'])) return 'C';
  if (includesAny(normalized, ['5 years', '5 ou mais', '5 years or more', 'mais de 5', '>=5', '5+'])) return 'D';
  return 'E';
}

function mapInsuranceDuration(value) {
  const normalized = safeLower(value);
  if (!normalized) return { hasInsurance: true, option: 'C' };
  if (includesAny(normalized, ['no_prior_insurance', 'nao teve', 'não teve', 'sem seguro', 'nunca', 'never'])) return { hasInsurance: false, option: null };
  if (includesAny(normalized, ['lt_6m', '6m_1y', 'menos', 'less', '6 meses', '6 months'])) return { hasInsurance: true, option: 'A' };
  if (/1[-_ ]?y[-_ ]?3y|1-3|1 a 3|1 to 3/.test(normalized)) return { hasInsurance: true, option: 'B' };
  if (/3[-_ ]?y[-_ ]?5y|3-5|3 a 5|3 to 5/.test(normalized)) return { hasInsurance: true, option: 'C' };
  if (/5y[_-]?plus|5\+|mais de 5|5 or more/.test(normalized)) return { hasInsurance: true, option: 'D' };
  return { hasInsurance: true, option: 'D' };
}

function mapResidenceDuration(value) {
  const normalized = safeLower(value);
  if (!normalized) return 'B';
  if (/5y[_-]?plus|mais|5 or more|5\+/.test(normalized)) return 'C';
  return 'B';
}

function isFinancedVehicle(value) {
  const normalized = safeLower(value);
  return /financi|finance|payments|paying|lease/.test(normalized) && !/quitad|paid|own/.test(normalized);
}

function isMarriedStatus(value) {
  const normalized = safeLower(value);
  return /married|casad/.test(normalized) && !/single|solteir/.test(normalized);
}

function isMaleGender(value) {
  const normalized = safeLower(value);
  if (!normalized || /female|femin|woman|mulher/.test(normalized)) return false;
  return /\bmale\b|^m$|mascul|homem|\bman\b/.test(normalized);
}

function isFemaleGender(value) {
  const normalized = safeLower(value);
  return /fem/.test(normalized) || /woman|mulher/.test(normalized);
}

function derivePurchaseYear(value, currentYear = new Date().getFullYear()) {
  const normalized = safeLower(value);
  if (/menos de 1|less than 1|< ?1/.test(normalized)) return currentYear;
  if (/1-3|1\/3|1 a 3|1\s*3|1 to 3/.test(normalized)) return currentYear - 2;
  if (/3-5|3\/5|3 a 5|3\s*5|3 to 5/.test(normalized)) return currentYear - 4;
  if (/5\+|5 or more|5\s*\+/.test(normalized)) return currentYear - 5;
  return currentYear;
}

module.exports = {
  STANDARD_QUOTE_DEFAULTS,
  safeLower,
  mapVehicleOwnership,
  mapInsuranceDuration,
  mapResidenceDuration,
  isFinancedVehicle,
  isMarriedStatus,
  isMaleGender,
  isFemaleGender,
  derivePurchaseYear
};
