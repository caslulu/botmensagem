/**
 * Aplica máscara de data brasileira (DD/MM/YYYY)
 */
export const applyDateMask = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Aplica a máscara DD/MM/YYYY
  if (numbers.length <= 2) {
    return numbers;
  } else if (numbers.length <= 4) {
    return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  } else {
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  }
};

/**
 * Valida se a data está no formato DD/MM/YYYY
 */
export const isValidBrazilianDate = (date: string): boolean => {
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = date.match(regex);
  
  if (!match) return false;
  
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  
  // Valida ranges básicos
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  
  // Valida dias por mês
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) return false;
  
  return true;
};

/**
 * Converte data brasileira (DD/MM/YYYY) para formato ISO (YYYY-MM-DD)
 * Usado para enviar ao backend
 */
export const brazilianToISO = (date: string): string => {
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = date.match(regex);
  
  if (!match) return date;
  
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
};

/**
 * Converte data ISO (YYYY-MM-DD) para formato brasileiro (DD/MM/YYYY)
 * Usado ao receber do backend
 */
export const isoToBrazilian = (date: string): string => {
  const regex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = date.match(regex);
  
  if (!match) return date;
  
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
};
