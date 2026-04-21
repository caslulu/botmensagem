import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CreateCardDto, CreateColumnDto, MoveCardDto, UpdateCardDto, UpdateColumnDto } from './dto';
import { KanbanService } from './kanban.service';

const ALLOWED_UPLOAD_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf']);

@Controller('kanban')
export class KanbanController {
  constructor(private readonly kanbanService: KanbanService) {}

  @Get()
  getBoard() {
    return this.kanbanService.getBoard();
  }

  @Post('columns')
  createColumn(@Body() dto: CreateColumnDto) {
    return this.kanbanService.createColumn(dto);
  }

  @Patch('columns/:id')
  updateColumn(@Param('id') id: string, @Body() dto: UpdateColumnDto) {
    return this.kanbanService.updateColumn(id, dto);
  }

  @Delete('columns/:id')
  deleteColumn(@Param('id') id: string) {
    return this.kanbanService.deleteColumn(id);
  }

  @Post('cards')
  createCard(@Body() dto: CreateCardDto) {
    return this.kanbanService.createCard(dto);
  }

  @Patch('cards/:id')
  updateCard(@Param('id') id: string, @Body() dto: UpdateCardDto) {
    return this.kanbanService.updateCard(id, dto);
  }

  @Patch('cards/:id/move')
  moveCard(@Param('id') id: string, @Body() dto: MoveCardDto) {
    return this.kanbanService.moveCard(id, dto);
  }

  @Delete('cards/:id')
  deleteCard(@Param('id') id: string) {
    return this.kanbanService.deleteCard(id);
  }

  @Post('cards/:id/attachments')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  attachFile(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo obrigatorio.');
    if (!ALLOWED_UPLOAD_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Tipo de arquivo nao permitido.');
    }
    return this.kanbanService.attachFile(id, file);
  }
}
