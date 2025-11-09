export type VinInfo = {
  make?: string;
  model?: string;
  year?: string;
};

/**
 * Decode a VIN using the NHTSA VPIC API.
 * Returns make, model and model year when available.
 */
export async function decodeVin(vin: string): Promise<VinInfo | null> {
  const clean = (vin || '').trim().toUpperCase();
  if (clean.length < 11) return null;
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${encodeURIComponent(clean)}?format=json`;
  try {
    const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!resp.ok) return null;
    const data = await resp.json();
    const row = data?.Results?.[0] || {};
    const info: VinInfo = {
      make: row?.Make || '',
      model: row?.Model || '',
      year: row?.ModelYear || row?.Model_Year || ''
    };
    return info;
  } catch (_e) {
    return null;
  }
}

/**
 * Generate an email from full name using first and last tokens.
 * Example: "João Carlos da Silva" -> "joao.silva@example.com"
 */
export function emailFromName(fullName: string, domain = 'example.com'): string {
  const parts = (fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '';
  const first = parts[0].normalize('NFD').replace(/[^\w]/g, '');
  const last = (parts[parts.length - 1] || '')
    .normalize('NFD')
    .replace(/[^\w]/g, '');
  const email = `${first}.${last}`.toLowerCase();
  return last ? `${email}@${domain}` : `${first}@${domain}`;
}
