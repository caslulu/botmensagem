import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { KanbanController } from './kanban.controller';
import { KanbanService } from './kanban.service';

@Module({
  imports: [FilesModule],
  controllers: [KanbanController],
  providers: [KanbanService],
  exports: [KanbanService]
})
export class KanbanModule {}
