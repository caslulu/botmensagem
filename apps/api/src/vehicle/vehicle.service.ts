import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

const VIN_DECODE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/';

@Injectable()
export class VehicleService {
  async decodeVin(vin: string) {
    const sanitized = String(vin || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (sanitized.length < 11) {
      throw new BadRequestException('VIN invalido.');
    }

    const response = await fetch(`${VIN_DECODE_URL}${encodeURIComponent(sanitized)}?format=json`, {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) {
      throw new Error('Falha ao consultar o VIN.');
    }

    const payload = (await response.json()) as any;
    const row = payload?.Results?.[0] || {};
    const data = {
      vin: sanitized,
      year: row?.ModelYear || row?.Model_Year || '',
      make: row?.Make || '',
      model: row?.Model || ''
    };

    if (!data.year && !data.make && !data.model) {
      throw new NotFoundException('Nao foi possivel decodificar o VIN.');
    }

    return { data };
  }
}
