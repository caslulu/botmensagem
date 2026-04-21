import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { RtaController } from './rta.controller';
import { RtaService } from './rta.service';

@Module({
  imports: [FilesModule],
  controllers: [RtaController],
  providers: [RtaService]
})
export class RtaModule {}
