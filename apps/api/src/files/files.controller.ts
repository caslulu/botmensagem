import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import path from 'node:path';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const file = await this.filesService.getDownloadable(id);
    res.setHeader('Content-Type', file.mimeType);
    return res.download(file.path, file.filename);
  }

  @Get(':id/preview')
  async preview(@Param('id') id: string, @Res() res: Response) {
    const file = await this.filesService.getDownloadable(id);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(file.filename).replace(/"/g, '')}"`);
    return res.sendFile(file.path);
  }
}
