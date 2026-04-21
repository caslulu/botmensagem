type Vehicle = {
  vin?: string;
  placa?: string;
  financiado?: string;
  tempo_com_veiculo?: string;
  ano?: string | number;
  marca?: string;
  modelo?: string;
};

type Person = {
  nome?: string;
  documento?: string;
  documento_estado?: string;
  data_nascimento?: string | number | Date;
  parentesco?: string;
  genero?: string;
};

type CardPayload = Record<string, any>;

function sanitizeString(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function parseJsonList<T>(input: unknown): T[] {
  if (!input) return [];
  if (Array.isArray(input)) return input as T[];
  if (typeof input !== 'string') return [];

  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (_) {
    return [];
  }
}

function padTwoDigits(value: string | number): string {
  return String(value).padStart(2, '0');
}

export function formatDateToMmDdYyyy(value: unknown): string {
  if (value === undefined || value === null) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;

  const parsedDate = /^\d+$/.test(raw) ? new Date(Number(raw)) : new Date(raw);
  if (Number.isNaN(parsedDate.getTime())) return raw;
  return `${padTwoDigits(parsedDate.getMonth() + 1)}/${padTwoDigits(parsedDate.getDate())}/${parsedDate.getFullYear()}`;
}

function composeAddress(data: CardPayload): string {
  if (data.endereco) return sanitizeString(data.endereco);

  const parts: string[] = [];
  if (data.endereco_rua) parts.push(sanitizeString(data.endereco_rua));
  if (data.endereco_apt) parts.push(`Apt ${sanitizeString(data.endereco_apt)}`);

  const cityState = [sanitizeString(data.endereco_cidade), sanitizeString(data.endereco_estado)]
    .filter(Boolean)
    .join(' - ');
  const zip = sanitizeString(data.endereco_zipcode);

  if (cityState) {
    parts.push(zip ? `${cityState}, ${zip}` : cityState);
  } else if (zip) {
    parts.push(zip);
  }

  return parts.filter(Boolean).join(', ');
}

function formatVehicles(vehicles: unknown): string {
  const list = parseJsonList<Vehicle>(vehicles);
  if (!list.length) return '';

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

function formatPeople(people: unknown): string {
  const list = parseJsonList<Person>(people);
  if (!list.length) return '';

  let description = `\nDRIVERS ADICIONAIS:\n`;

  list.forEach((person, index) => {
    const name = person?.nome || '-';
    const document = person?.documento || '-';
    const documentState = person?.documento_estado || '-';
    const birth = formatDateToMmDdYyyy(person?.data_nascimento) || '-';
    const relation = person?.parentesco || '-';
    const gender = person?.genero || '-';

    description += `\n👤 Driver ${index + 1}:\n`;
    description += `   Nome: ${name}\n`;
    description += `   Documento: ${document} (${documentState})\n`;
    description += `   Data de Nascimento: ${birth}\n`;
    description += `   Parentesco: ${relation}\n`;
    description += `   Gênero: ${gender}\n`;
  });

  return description;
}

export function generateEmail(fullName: string | undefined, documentNumber: string | undefined): string {
  const sanitized = String(fullName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .toLowerCase();

  const doc = String(documentNumber || '').replace(/[^0-9]/g, '').slice(-4);
  if (!sanitized) return `cliente${doc}@outlook.com`;

  const tokens = sanitized.split(/\s+/).filter(Boolean);
  const firstName = tokens[0];
  const lastName = tokens.length > 1 ? tokens[tokens.length - 1] : '';
  return `${lastName ? `${firstName}${lastName}` : firstName}${doc}@outlook.com`;
}

export function buildCardDescription(data: CardPayload = {}): string {
  const email = sanitizeString(data.email) || generateEmail(data.nome, data.documento);
  const address = composeAddress(data) || '-';
  const documentoEstado = sanitizeString(data.documento_estado) || '-';
  const clienteBirth = formatDateToMmDdYyyy(data.data_nascimento);
  const conjBirth = formatDateToMmDdYyyy(data.data_nascimento_conjuge);
  const conjDocState = sanitizeString(data.documento_estado_conjuge) || '-';

  let description = '';
  description += `Documento: ${sanitizeString(data.documento) || '-'}\n`;
  description += `Estado do Documento: ${documentoEstado}\n`;
  description += `Estado Civil: ${sanitizeString(data.estado_civil) || '-'}\n`;
  description += `Gênero: ${sanitizeString(data.genero) || '-'}\n`;
  description += `Endereço: ${address}\n`;
  description += `Data de Nascimento: ${clienteBirth || '-'}\n`;
  description += `Tempo de Seguro: ${sanitizeString(data.tempo_de_seguro) || '-'}\n`;
  description += `Tempo no Endereço: ${sanitizeString(data.tempo_no_endereco) || '-'}\n`;
  description += `Email: ${email || '-'}\n`;
  description += formatVehicles(data.veiculos);
  description += formatPeople(data.pessoas);

  if (data.nome_conjuge) {
    description += `\nINFORMAÇÕES DO CÔNJUGE:\n`;
    description += `Nome: ${sanitizeString(data.nome_conjuge) || '-'}\n`;
    description += `Data de Nascimento: ${conjBirth || '-'}\n`;
    description += `Documento: ${sanitizeString(data.documento_conjuge) || '-'}\n`;
    description += `Estado do Documento: ${conjDocState}\n`;
  }

  if (data.observacoes) {
    description += `\nOBSERVAÇÕES:\n${sanitizeString(data.observacoes)}\n`;
  }

  return description;
}
