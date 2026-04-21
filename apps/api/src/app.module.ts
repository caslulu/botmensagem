import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { FilesModule } from './files/files.module';
import { HealthController } from './health.controller';
import { KanbanModule } from './kanban/kanban.module';
import { PriceModule } from './price/price.module';
import { PrismaModule } from './prisma/prisma.module';
import { RtaModule } from './rta/rta.module';
import { VehicleModule } from './vehicle/vehicle.module';

@Module({
  imports: [PrismaModule, AuthModule, FilesModule, KanbanModule, RtaModule, PriceModule, VehicleModule],
  controllers: [HealthController]
})
export class AppModule {}
