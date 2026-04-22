import fs from 'node:fs';
import path from 'node:path';
import { Injectable, NotFoundException } from '@nestjs/common';
import { FileAsset } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { downloadUrl, ensureDir, previewUrl, sanitizeFileName, storagePath } from '../common/paths';
import { PrismaService } from '../prisma/prisma.service';

type CreateFileAssetInput = {
  kind: string;
  filename: string;
  mimeType: string;
  absolutePath: string;
  cardId?: string | null;
};

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  generatedDir() {
    return ensureDir(storagePath('GENERATED_DIR', path.join(process.cwd(), 'storage', 'generated')));
  }

  uploadsDir() {
    return ensureDir(storagePath('UPLOADS_DIR', path.join(process.cwd(), 'storage', 'uploads')));
  }

  async writeUpload(file: Express.Multer.File, cardId?: string) {
    const idPrefix = randomUUID();
    const safeName = sanitizeFileName(file.originalname || 'anexo');
    const targetPath = path.join(this.uploadsDir(), `${idPrefix}-${safeName}`);
    await fs.promises.writeFile(targetPath, file.buffer);

    return this.create({
      kind: 'attachment',
      filename: safeName,
      mimeType: file.mimetype || 'application/octet-stream',
      absolutePath: targetPath,
      cardId
    });
  }

  async create(input: CreateFileAssetInput) {
    const record = await this.prisma.fileAsset.create({
      data: {
        kind: input.kind,
        filename: sanitizeFileName(input.filename),
        mimeType: input.mimeType,
        path: path.resolve(input.absolutePath),
        cardId: input.cardId || null
      }
    });

    return this.withDownloadUrl(record);
  }

  async getDownloadable(id: string): Promise<FileAsset> {
    const record = await this.prisma.fileAsset.findUnique({ where: { id } });
    if (!record || !fs.existsSync(record.path)) {
      throw new NotFoundException('Arquivo não encontrado.');
    }
    return record;
  }

  async deleteForCard(cardId: string) {
    const records = await this.prisma.fileAsset.findMany({ where: { cardId } });
    if (!records.length) return;

    await this.prisma.fileAsset.deleteMany({ where: { cardId } });

    await Promise.all(
      records.map(async (record) => {
        try {
          await fs.promises.unlink(record.path);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
        }
      })
    );
  }

  withDownloadUrl<T extends FileAsset>(file: T): T & { downloadUrl: string; previewUrl: string } {
    return {
      ...file,
      downloadUrl: downloadUrl(file.id),
      previewUrl: previewUrl(file.id)
    };
  }
}
