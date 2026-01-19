const DEFAULT_EMAIL_DOMAIN = 'outlook.com';

function splitName(fullName = '') {
  if (!fullName) {
    return ['Cliente', ''];
  }
  const tokens = String(fullName)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) {
    return ['Cliente', ''];
  }
  const firstName = tokens[0];
  const lastName = tokens.length > 1 ? tokens[tokens.length - 1] : tokens[0];
  return [firstName, lastName];
}

function normalizeString(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeZip(zip = '') {
  return normalizeString(zip, '').replace(/[^0-9]/g, '').slice(0, 10);
}

function formatDateForUs(value) {
  if (!value) {
    return '';
  }

  const raw = String(value).trim();
  if (!raw) {
    return '';
  }

  if (/x/i.test(raw)) {
    return '';
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    return raw;
  }

  const separators = raw.split(/[^0-9]/).filter(Boolean);
  let year;
  let month;
  let day;

  if (separators.length >= 3) {
    const [part1, part2, part3] = separators;
    if (part1.length === 4) {
      year = part1;
      month = part2;
      day = part3;
    } else if (part3.length === 4) {
      year = part3;
      if (Number(part1) > 12 && Number(part2) <= 12) {
        day = part1;
        month = part2;
      } else if (Number(part2) > 12 && Number(part1) <= 12) {
        day = part2;
        month = part1;
      } else if (Number(part1) <= 12 && Number(part2) <= 12 && Number(part1) !== Number(part2)) {
        month = part1;
        day = part2;
      } else {
        month = part1;
        day = part2;
      }
    }
  }

  if (!year || !month || !day) {
    const digits = raw.replace(/[^0-9]/g, '');
    if (digits.length < 8) {
      return '';
    }

    if (/^\d{4}/.test(digits)) {
      year = digits.slice(0, 4);
      month = digits.slice(4, 6);
      day = digits.slice(6, 8);
    } else {
      const first = digits.slice(0, 2);
      const second = digits.slice(2, 4);
      const third = digits.slice(4, 8);
      year = third;

      if (Number(first) > 12 && Number(second) <= 12) {
        day = first;
        month = second;
      } else {
        month = first;
        day = second;
      }
    }
  }

  if (!year || !month || !day) {
    return '';
  }

  const monthNum = Number(month);
  const dayNum = Number(day);
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
    return '';
  }

  return `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${year.padStart(4, '0')}`;
}

function generateEmail(fullName = '', documentNumber = '') {
  const sanitized = String(fullName)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .toLowerCase();

  const doc = String(documentNumber || '').replace(/[^0-9]/g, '');

  if (!sanitized) {
    return `cliente${doc}@${DEFAULT_EMAIL_DOMAIN}`;
  }

  const tokens = sanitized.split(/\s+/).filter(Boolean);
  const firstName = tokens[0];
  const lastName = tokens.length > 1 ? tokens[tokens.length - 1] : '';
  const localPart = lastName ? `${firstName}${lastName}` : firstName;

  return `${localPart}${doc}@${DEFAULT_EMAIL_DOMAIN}`;
}

function normalizeVehicles(rawVehicles) {
  if (!Array.isArray(rawVehicles) || !rawVehicles.length) {
    return [];
  }
  return rawVehicles
    .map((vehicle) => ({
      vin: normalizeString(vehicle?.vin)?.toUpperCase() || '',
      placa: normalizeString(vehicle?.placa),
      financiado: normalizeString(vehicle?.financiado),
      tempo_com_veiculo: normalizeString(vehicle?.tempo_com_veiculo)
    }))
    .filter((vehicle) => vehicle.vin);
}

function normalizePeople(rawPeople) {
  if (!Array.isArray(rawPeople) || !rawPeople.length) {
    return [];
  }

  return rawPeople
    .map((person) => ({
      nome: normalizeString(person?.nome),
      documento: normalizeString(person?.documento),
      data_nascimento: normalizeString(person?.data_nascimento),
      parentesco: normalizeString(person?.parentesco),
      genero: normalizeString(person?.genero)
    }))
    .filter((person) => person.nome);
}

function mapQuoteToProgressive(quote) {
  if (!quote) {
    throw new Error('Cotação inválida.');
  }

  const payload = typeof quote.payload === 'object' && quote.payload !== null ? quote.payload : {};

  const fullName = normalizeString(payload.nome || quote.nome || '');
  const [firstName, lastName] = splitName(fullName);
  const document = normalizeString(payload.documento || quote.documento);

  const zipcode = normalizeZip(payload.endereco_zipcode || '');
  if (!zipcode) {
    throw new Error('ZIP Code não informado na cotação.');
  }

  const veiculos = normalizeVehicles(payload.veiculos);
  if (!veiculos.length) {
    throw new Error('Nenhum veículo encontrado na cotação.');
  }

  const pessoasExtras = normalizePeople(payload.pessoas);

  const data = {
    firstName,
    lastName,
    email: generateEmail(fullName, document),
  dataNascimento: normalizeString(payload.data_nascimento),
  dataNascimentoUs: formatDateForUs(payload.data_nascimento),
    zipcode,
    rua: normalizeString(payload.endereco_rua),
    apt: normalizeString(payload.endereco_apt),
    cidade: normalizeString(payload.endereco_cidade),
    estadoResidencia: normalizeString(payload.endereco_estado),
    genero: normalizeString(payload.genero, 'Masculino'),
    documento: document,
    estadoDocumento: normalizeString(payload.documento_estado),
    tempoDeSeguro: normalizeString(payload.tempo_de_seguro),
    tempoNoEndereco: normalizeString(payload.tempo_no_endereco),
    estadoCivil: normalizeString(payload.estado_civil),
    nomeConjuge: normalizeString(payload.nome_conjuge),
  dataNascimentoConjuge: normalizeString(payload.data_nascimento_conjuge),
  dataNascimentoConjugeUs: formatDateForUs(payload.data_nascimento_conjuge),
    documentoConjuge: normalizeString(payload.documento_conjuge),
    veiculos,
    pessoasExtras,
    bruto: payload
  };

  return data;
}

function mapQuoteToLiberty(quote) {
  try {
    return mapQuoteToProgressive(quote);
  } catch (err) {
    // If progressive mapping failed due to missing ZIP, try common alternate keys
    const payload = (quote && quote.payload) || {};
    const candidates = [
      payload.zipcode,
      payload.zip,
      payload.endereco_cep,
      payload.cep,
      payload.address_zipcode,
      payload.endereco?.zipcode
    ].filter(Boolean);

    if (candidates.length === 0) {
      throw err;
    }

    const chosen = String(candidates[0] || '').trim();
    const cloned = JSON.parse(JSON.stringify(quote || {}));
    cloned.payload = cloned.payload || {};
    cloned.payload.endereco_zipcode = chosen;
    return mapQuoteToProgressive(cloned);
  }
}

module.exports = {
  mapQuoteToProgressive,
  mapQuoteToLiberty,
  splitName,
  generateEmail,
  normalizeVehicles,
  normalizePeople,
  formatDateForUs
};
