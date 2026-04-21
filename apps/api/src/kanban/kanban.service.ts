import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { KanbanCard, KanbanColumn, Prisma } from '@prisma/client';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';
import { buildCardDescription } from './card-description';
import { CreateCardDto, CreateColumnDto, MoveCardDto, UpdateCardDto, UpdateColumnDto } from './dto';

const DEFAULT_COLUMNS = ['Cotações para fazer', 'Em cotação', 'Pronto'];

function readString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function titleFromPayload(payload: Record<string, unknown>, explicitTitle?: string): string {
  return readString(explicitTitle, payload.nome, payload.name) || 'Sem nome';
}

@Injectable()
export class KanbanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService
  ) {}

  async ensureDefaultColumns(): Promise<KanbanColumn[]> {
    const existing = await this.prisma.kanbanColumn.findMany({ orderBy: { position: 'asc' } });
    if (existing.length) return existing;

    await this.prisma.kanbanColumn.createMany({
      data: DEFAULT_COLUMNS.map((title, position) => ({ title, position }))
    });

    return this.prisma.kanbanColumn.findMany({ orderBy: { position: 'asc' } });
  }

  async getBoard() {
    await this.ensureDefaultColumns();
    const columns = await this.prisma.kanbanColumn.findMany({
      orderBy: { position: 'asc' },
      include: {
        cards: {
          orderBy: { position: 'asc' },
          include: {
            files: { orderBy: { createdAt: 'desc' } },
            prices: { orderBy: { updatedAt: 'desc' }, take: 1 }
          }
        }
      }
    });

    return {
      columns: columns.map((column) => ({
        ...column,
        cards: column.cards.map((card) => ({
          ...card,
          files: card.files.map((file) => this.filesService.withDownloadUrl(file)),
          latestPrice: card.prices[0] || null
        }))
      }))
    };
  }

  async createColumn(dto: CreateColumnDto) {
    const max = await this.prisma.kanbanColumn.aggregate({ _max: { position: true } });
    return this.prisma.kanbanColumn.create({
      data: {
        title: dto.title.trim(),
        position: (max._max.position ?? -1) + 1
      }
    });
  }

  async updateColumn(id: string, dto: UpdateColumnDto) {
    const column = await this.prisma.kanbanColumn.findUnique({ where: { id } });
    if (!column) throw new NotFoundException('Coluna nao encontrada.');

    if (dto.title !== undefined) {
      await this.prisma.kanbanColumn.update({
        where: { id },
        data: { title: dto.title.trim() }
      });
    }

    if (dto.position !== undefined) {
      await this.reorderColumns(id, dto.position);
    }

    return this.prisma.kanbanColumn.findUnique({ where: { id } });
  }

  async deleteColumn(id: string) {
    const cardCount = await this.prisma.kanbanCard.count({ where: { columnId: id } });
    if (cardCount > 0) {
      throw new ConflictException('A coluna precisa estar vazia antes de ser removida.');
    }

    await this.prisma.kanbanColumn.delete({ where: { id } });
    await this.normalizeColumnPositions();
    return { deleted: true };
  }

  async createCard(dto: CreateCardDto) {
    const columns = await this.ensureDefaultColumns();
    const columnId = dto.columnId || columns[0].id;
    const column = await this.prisma.kanbanColumn.findUnique({ where: { id: columnId } });
    if (!column) throw new NotFoundException('Coluna nao encontrada.');

    const max = await this.prisma.kanbanCard.aggregate({
      where: { columnId },
      _max: { position: true }
    });
    const payload = dto.payload as Prisma.InputJsonObject;

    return this.prisma.kanbanCard.create({
      data: {
        columnId,
        title: titleFromPayload(dto.payload, dto.title),
        description: buildCardDescription(dto.payload),
        payload,
        position: (max._max.position ?? -1) + 1
      }
    });
  }

  async updateCard(id: string, dto: UpdateCardDto) {
    const card = await this.prisma.kanbanCard.findUnique({ where: { id } });
    if (!card) throw new NotFoundException('Card nao encontrado.');

    const payload = (dto.payload || (card.payload as Record<string, unknown>)) as Record<string, unknown>;
    return this.prisma.kanbanCard.update({
      where: { id },
      data: {
        title: titleFromPayload(payload, dto.title || card.title),
        description: buildCardDescription(payload),
        payload: payload as Prisma.InputJsonObject
      }
    });
  }

  async moveCard(id: string, dto: MoveCardDto) {
    const card = await this.prisma.kanbanCard.findUnique({ where: { id } });
    if (!card) throw new NotFoundException('Card nao encontrado.');

    const targetColumn = await this.prisma.kanbanColumn.findUnique({ where: { id: dto.columnId } });
    if (!targetColumn) throw new NotFoundException('Coluna de destino nao encontrada.');

    const targetCards = await this.prisma.kanbanCard.findMany({
      where: { columnId: dto.columnId, id: { not: id } },
      orderBy: { position: 'asc' }
    });
    const targetPosition = Math.max(0, Math.min(dto.position, targetCards.length));
    targetCards.splice(targetPosition, 0, card);

    const updates: Prisma.PrismaPromise<KanbanCard>[] = [
      this.prisma.kanbanCard.update({
        where: { id },
        data: { columnId: dto.columnId, position: targetPosition }
      })
    ];

    targetCards.forEach((item, position) => {
      updates.push(this.prisma.kanbanCard.update({ where: { id: item.id }, data: { columnId: dto.columnId, position } }));
    });

    if (card.columnId !== dto.columnId) {
      const sourceCards = await this.prisma.kanbanCard.findMany({
        where: { columnId: card.columnId, id: { not: id } },
        orderBy: { position: 'asc' }
      });
      sourceCards.forEach((item, position) => {
        updates.push(this.prisma.kanbanCard.update({ where: { id: item.id }, data: { position } }));
      });
    }

    await this.prisma.$transaction(updates);
    return this.prisma.kanbanCard.findUnique({ where: { id } });
  }

  async deleteCard(id: string) {
    await this.prisma.kanbanCard.delete({ where: { id } });
    return { deleted: true };
  }

  async attachFile(cardId: string, file: Express.Multer.File) {
    const card = await this.prisma.kanbanCard.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Card nao encontrado.');
    return this.filesService.writeUpload(file, cardId);
  }

  private async reorderColumns(id: string, targetPosition: number) {
    const columns = await this.prisma.kanbanColumn.findMany({ orderBy: { position: 'asc' } });
    const current = columns.find((column) => column.id === id);
    if (!current) return;

    const withoutCurrent = columns.filter((column) => column.id !== id);
    const bounded = Math.max(0, Math.min(targetPosition, withoutCurrent.length));
    withoutCurrent.splice(bounded, 0, current);

    await this.prisma.$transaction(
      withoutCurrent.map((column, position) => this.prisma.kanbanColumn.update({ where: { id: column.id }, data: { position } }))
    );
  }

  private async normalizeColumnPositions() {
    const columns = await this.prisma.kanbanColumn.findMany({ orderBy: { position: 'asc' } });
    await this.prisma.$transaction(
      columns.map((column, position) => this.prisma.kanbanColumn.update({ where: { id: column.id }, data: { position } }))
    );
  }
}
