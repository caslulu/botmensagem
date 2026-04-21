import { Controller, Get, Param } from '@nestjs/common';
import { VehicleService } from './vehicle.service';

@Controller('vehicles')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Get('vin/:vin')
  decodeVin(@Param('vin') vin: string) {
    return this.vehicleService.decodeVin(vin);
  }
}
