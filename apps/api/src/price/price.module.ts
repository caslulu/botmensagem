import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { PriceController } from './price.controller';
import { PriceService } from './price.service';

@Module({
  imports: [FilesModule],
  controllers: [PriceController],
  providers: [PriceService]
})
export class PriceModule {}
