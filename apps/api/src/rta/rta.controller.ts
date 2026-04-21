import { Body, Controller, Post } from '@nestjs/common';
import { GenerateRtaDto } from './dto';
import { RtaService } from './rta.service';

@Controller('rta')
export class RtaController {
  constructor(private readonly rtaService: RtaService) {}

  @Post('generate')
  generate(@Body() dto: GenerateRtaDto) {
    return this.rtaService.generate(dto);
  }
}
