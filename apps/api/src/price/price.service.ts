import fs from 'node:fs';
import path from 'node:path';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { assetsRoot, sanitizeFileName } from '../common/paths';
import { formatWithComma, parseCurrency } from '../common/number';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';
import { GeneratePriceDto, SaveQuoteDto } from './dto';

type CanvasModule = typeof import('@napi-rs/canvas');
type CanvasRenderingContext2D = any;
type CanvasAlign = 'center' | 'left' | 'right' | 'start' | 'end';

type OverlayEntry = {
  text?: string;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  weight?: number | string;
  align?: CanvasAlign;
  maxWidth?: number;
};

let createCanvas: CanvasModule['createCanvas'] | undefined;
let loadImage: CanvasModule['loadImage'] | undefined;
let GlobalFonts: CanvasModule['GlobalFonts'] | undefined;

try {
  const canvasModule = require('@napi-rs/canvas') as CanvasModule;
  createCanvas = canvasModule.createCanvas;
  loadImage = canvasModule.loadImage;
  GlobalFonts = canvasModule.GlobalFonts;
} catch (error) {
  console.warn('[PriceService] @napi-rs/canvas indisponivel:', (error as Error).message);
}

export function processQuitado(payload: Record<string, any>, taxValue: number | string | undefined) {
  const tax = Number.isFinite(taxValue as number) ? (taxValue as number) : parseCurrency(taxValue ?? 320);

  return {
    nome: payload.nome || '',
    entrada_basico: formatWithComma(parseCurrency(payload.entrada_basico) + tax),
    mensal_basico: payload.mensal_basico || '',
    valor_total_basico: formatWithComma(parseCurrency(payload.valor_total_basico) + tax),
    entrada_completo: formatWithComma(parseCurrency(payload.entrada_completo) + tax),
    mensal_completo: payload.mensal_completo || '',
    valor_total_completo: formatWithComma(parseCurrency(payload.valor_total_completo) + tax)
  };
}

export function processFinanciado(payload: Record<string, any>, taxValue: number | string | undefined) {
  const tax = Number.isFinite(taxValue as number) ? (taxValue as number) : parseCurrency(taxValue ?? 320);

  return {
    nome: payload.nome || '',
    entrada_completo: formatWithComma(parseCurrency(payload.entrada_completo) + tax),
    mensal_completo: payload.mensal_completo || '',
    valor_total_completo: formatWithComma(parseCurrency(payload.valor_total_completo) + tax)
  };
}

@Injectable()
export class PriceService {
  private fontRegistered = false;
  private readonly fontFamily = 'PriceFont';

  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService
  ) {}

  async listQuotes() {
    const [cards, manualPrices] = await Promise.all([
      this.prisma.kanbanCard.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
          prices: { orderBy: { updatedAt: 'desc' }, take: 1 }
        }
      }),
      this.prisma.quotePrice.findMany({
        where: { cardId: null },
        orderBy: { updatedAt: 'desc' }
      })
    ]);

    return {
      quotes: [
        ...cards.map((card) => ({
          id: card.id,
          cardId: card.id,
          label: card.title,
          title: card.title,
          payload: card.payload,
          latestPrice: card.prices[0] || null,
          updatedAt: card.updatedAt
        })),
        ...manualPrices.map((price) => {
          const payload = price.payload as Record<string, any>;
          const title = String(payload?.campos?.nome || payload?.nome || 'Cotacao manual');
          return {
            id: price.id,
            cardId: null,
            label: title,
            title,
            payload,
            latestPrice: price,
            updatedAt: price.updatedAt
          };
        })
      ]
    };
  }

  async saveQuote(dto: SaveQuoteDto) {
    const cardId = dto.cardId?.trim() || null;
    if (cardId) {
      await this.ensureCardExists(cardId);
    }

    const record = await this.prisma.quotePrice.create({
      data: {
        cardId,
        payload: dto.payload as Prisma.InputJsonObject,
        processed: (dto.processed || {}) as Prisma.InputJsonObject
      }
    });

    return { quote: record };
  }

  async generate(dto: GeneratePriceDto) {
    const cardId = dto.cardId?.trim() || null;
    if (cardId) {
      await this.ensureCardExists(cardId);
    }

    const language = this.normalizeLanguage(dto.idioma);
    const templatePath = this.pickTemplate(dto.formType, language);
    let processed: Record<string, unknown>;
    let overlayEntries: OverlayEntry[];
    if (dto.formType === 'quitado') {
      const paidOff = processQuitado(dto.campos, dto.taxaCotacao ?? 320);
      processed = paidOff;
      overlayEntries = this.quitadoOverlay(dto.seguradora, paidOff);
    } else {
      const financed = processFinanciado(dto.campos, dto.taxaCotacao ?? 320);
      processed = financed;
      overlayEntries = this.financiadoOverlay(dto.seguradora, financed);
    }

    const { outputPath, fileName } = await this.renderImage(templatePath, overlayEntries, dto.formType, language);
    const file = await this.filesService.create({
      kind: 'price',
      filename: fileName,
      mimeType: 'image/png',
      absolutePath: outputPath,
      cardId
    });

    let quotePrice = null;
    if (cardId) {
      quotePrice = await this.prisma.quotePrice.create({
        data: {
          cardId,
          payload: {
            formType: dto.formType,
            seguradora: dto.seguradora,
            idioma: language,
            taxaCotacao: dto.taxaCotacao ?? 320,
            campos: dto.campos
          } as Prisma.InputJsonObject,
          processed: processed as Prisma.InputJsonObject
        }
      });
    }

    return {
      fileId: file.id,
      filename: file.filename,
      downloadUrl: file.downloadUrl,
      attachedCardId: cardId,
      processed,
      quotePrice
    };
  }

  private async ensureCardExists(cardId: string) {
    const card = await this.prisma.kanbanCard.findUnique({ where: { id: cardId }, select: { id: true } });
    if (!card) {
      throw new NotFoundException('Cotacao selecionada nao encontrada.');
    }
  }

  private normalizeLanguage(lang: string | undefined): 'pt' | 'en' | 'es' {
    const normalized = (lang || 'pt').toLowerCase();
    return ['pt', 'en', 'es'].includes(normalized) ? (normalized as 'pt' | 'en' | 'es') : 'pt';
  }

  private pickTemplate(formType: 'quitado' | 'financiado', language: 'pt' | 'en' | 'es'): string {
    const assetDir = path.join(assetsRoot(), 'price');
    const templates = {
      quitado: {
        pt: path.join(assetDir, 'images', 'basico.png'),
        en: path.join(assetDir, 'images', 'basico_en.png'),
        es: path.join(assetDir, 'images', 'basico_es.png')
      },
      financiado: {
        pt: path.join(assetDir, 'images', 'full.png'),
        en: path.join(assetDir, 'images', 'full_en.png'),
        es: path.join(assetDir, 'images', 'full_es.png')
      }
    };

    return templates[formType][language] || templates[formType].pt;
  }

  private ensureFontRegistered() {
    if (this.fontRegistered || !GlobalFonts) return;

    const fontPath = path.join(assetsRoot(), 'price', 'fonts', 'fonte.otf');
    if (!fs.existsSync(fontPath)) return;

    try {
      if (typeof (GlobalFonts as any).registerFromPath === 'function') {
        (GlobalFonts as any).registerFromPath(fontPath, this.fontFamily);
      } else {
        GlobalFonts.register(fs.readFileSync(fontPath), this.fontFamily);
      }
      this.fontRegistered = true;
    } catch (error) {
      console.warn('[PriceService] Falha ao registrar fonte:', (error as Error).message);
    }
  }

  private drawOverlay(ctx: CanvasRenderingContext2D, entries: OverlayEntry[]) {
    ctx.textBaseline = 'top';

    entries.forEach((entry) => {
      if (!entry.text || !entry.text.trim()) return;

      const { text, x = 0, y = 0, size = 48, color = '#ffffff', weight = 500, align = 'left', maxWidth } = entry;
      let currentSize = size;
      const fontWeight = Number.isFinite(weight as number) ? String(weight) : (weight || 'normal');

      ctx.font = `${fontWeight} ${currentSize}px "${this.fontFamily}", "Segoe UI", sans-serif`;
      if (maxWidth && maxWidth > 0) {
        let textWidth = ctx.measureText(String(text)).width;
        while (textWidth > maxWidth && currentSize > 10) {
          currentSize -= 2;
          ctx.font = `${fontWeight} ${currentSize}px "${this.fontFamily}", "Segoe UI", sans-serif`;
          textWidth = ctx.measureText(String(text)).width;
        }
      }

      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.fillText(String(text), x, y);
    });
  }

  private async renderImage(templatePath: string, overlayEntries: OverlayEntry[], formType: string, language: string) {
    if (!createCanvas || !loadImage) {
      throw new Error('Modulo nativo @napi-rs/canvas indisponivel.');
    }
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template nao encontrado: ${templatePath}`);
    }

    this.ensureFontRegistered();

    const baseImage = await loadImage(templatePath);
    const width = baseImage.width || 1600;
    const height = baseImage.height || 2000;
    const canvas = createCanvas(width, height);
    const ctx = (canvas as any).getContext('2d');
    if (!ctx) throw new Error('Contexto de canvas indisponivel.');

    ctx.drawImage(baseImage, 0, 0, width, height);
    this.drawOverlay(ctx, overlayEntries);

    const fileName = sanitizeFileName(`${formType}-${language}-${new Date().toISOString().replace(/[:.]/g, '-')}.png`);
    const outputPath = path.join(this.filesService.generatedDir(), fileName);
    const buffer = (canvas as any).toBuffer('image/png');
    await fs.promises.writeFile(outputPath, buffer);

    return { outputPath, fileName };
  }

  private quitadoOverlay(seguradora: string, processed: ReturnType<typeof processQuitado>): OverlayEntry[] {
    const yOffset = 15;
    return [
      { text: seguradora, x: 500, y: 543 + yOffset, size: 40, color: '#ffffff', align: 'center' },
      { text: seguradora, x: 1150, y: 543 + yOffset, size: 40, color: '#ffffff', align: 'center' },
      { text: processed.entrada_basico, x: 530, y: 1375 + yOffset, size: 55, color: '#000000', align: 'center' },
      { text: processed.mensal_basico, x: 540, y: 1525 + yOffset, size: 45, color: '#000000', align: 'center' },
      { text: processed.valor_total_basico, x: 510, y: 1655 + yOffset, size: 55, color: '#000000', align: 'center' },
      { text: processed.entrada_completo, x: 1200, y: 1375 + yOffset, size: 55, color: '#000000', align: 'center' },
      { text: processed.mensal_completo, x: 1200, y: 1520 + yOffset, size: 45, color: '#000000', align: 'center' },
      { text: processed.valor_total_completo, x: 1180, y: 1655 + yOffset, size: 55, color: '#000000', align: 'center' },
      { text: processed.nome, x: 490, y: 1890 + yOffset, size: 45, color: '#ffffff', align: 'left' }
    ];
  }

  private financiadoOverlay(seguradora: string, processed: ReturnType<typeof processFinanciado>): OverlayEntry[] {
    const yOffset = 15;
    return [
      { text: seguradora, x: 900, y: 552 + yOffset, size: 40, color: '#ffffff', align: 'center', maxWidth: 400 },
      { text: processed.entrada_completo, x: 960, y: 1400 + yOffset, size: 55, color: '#000000', align: 'center', maxWidth: 350 },
      { text: processed.mensal_completo, x: 960, y: 1545 + yOffset, size: 45, color: '#000000', align: 'center', maxWidth: 350 },
      { text: processed.valor_total_completo, x: 960, y: 1695 + yOffset, size: 55, color: '#000000', align: 'center', maxWidth: 350 },
      { text: processed.nome, x: 490, y: 1908 + yOffset, size: 45, color: '#ffffff', align: 'left', maxWidth: 800 }
    ];
  }
}
