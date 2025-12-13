const fs = require('fs');
const path = require('path');

function parseJsonList(input) {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return input;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) {
      return [];
    }

    try {
      return JSON.parse(trimmed);
    } catch (_) {
      return [];
    }
  }

  return [];
}

function padTwoDigits(value) {
  return String(value).padStart(2, '0');
}

function formatDateToMmDdYyyy(value) {
  if (value === undefined || value === null) {
    return '';
  }

  const raw = String(value).trim();
  if (!raw) {
    return '';
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    return raw;
  }

  if (/^\d+$/.test(raw)) {
    const parsedDate = new Date(Number(raw));
    if (!Number.isNaN(parsedDate.getTime())) {
      return `${padTwoDigits(parsedDate.getMonth() + 1)}/${padTwoDigits(parsedDate.getDate())}/${parsedDate.getFullYear()}`;
    }
  }

  const parsedDate = new Date(raw);
  if (!Number.isNaN(parsedDate.getTime())) {
    return `${padTwoDigits(parsedDate.getMonth() + 1)}/${padTwoDigits(parsedDate.getDate())}/${parsedDate.getFullYear()}`;
  }

  return raw;
}

function formatVehicles(vehicles) {
  const list = parseJsonList(vehicles);
  if (!list.length) {
    return '';
  }

  let description = `\nVEÍCULOS:\n`;

  list.forEach((vehicle, index) => {
    const vin = vehicle?.vin || '-';
    const plate = vehicle?.placa || '-';
    const financed = vehicle?.financiado || '-';
    const tenure = vehicle?.tempo_com_veiculo || '-';
    const year = vehicle?.ano || '';
    const make = vehicle?.marca || '';
    const model = vehicle?.modelo || '';
    const vehicleLabel = [year, make, model].filter(Boolean).join(' ').trim() || '-';

    description += `\n🚗 Veículo ${index + 1}:\n`;
    description += `   VIN: ${vin}\n`;
    description += `   Placa: ${plate}\n`;
    description += `   Veículo: ${vehicleLabel}\n`;
    description += `   Estado: ${financed}\n`;
    description += `   Tempo com veículo: ${tenure}\n`;
  });

  return description;
}

function formatPeople(people) {
  const list = parseJsonList(people);
  if (!list.length) {
    return '';
  }

  let description = `\nDRIVERS ADICIONAIS:\n`;

  list.forEach((person, index) => {
    const name = person?.nome || '-';
    const document = person?.documento || '-';
    const birth = formatDateToMmDdYyyy(person?.data_nascimento) || '-';
    const relation = person?.parentesco || '-';
    const gender = person?.genero || '-';

    description += `\n👤 Driver ${index + 1}:\n`;
    description += `   Nome: ${name}\n`;
    description += `   Documento: ${document}\n`;
    description += `   Data de Nascimento: ${birth}\n`;
    description += `   Parentesco: ${relation}\n`;
    description += `   Gênero: ${gender}\n`;
  });

  return description;
}

function formatAddress(address) {
  if (!address) {
    return '-';
  }
  return address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');
}

function formatPhone(phone) {
  if (!phone) {
    return '-';
  }

  const digits = String(phone)
    .split('')
    .filter((char) => /\d/.test(char))
    .join('');

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return phone;
}

module.exports = {
  formatVehicles,
  formatPeople,
  formatDateToMmDdYyyy,
  formatAddress,
  formatPhone,
  parseJsonList
};
