import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { parseCurrency, formatWithComma } from '../utils/number';
import quotesRepository from '../repositories/quotesRepository';
import trelloService from '../../trello/services/trelloService';

type CanvasModule = typeof import('@napi-rs/canvas');
type CanvasInstance = any;
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

type GenerateOptions = {
  formType: 'quitado' | 'financiado';
  seguradora: string;
  idioma?: string;
  taxaCotacao?: number | string;
  apenasPrever?: boolean;
  campos: Record<string, any>;
  cotacaoId?: string;
};

function ensureFolder(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

let createCanvas: CanvasModule['createCanvas'] | undefined;
let loadImage: CanvasModule['loadImage'] | undefined;
let GlobalFonts: CanvasModule['GlobalFonts'] | undefined;
let canvasAvailable = true;

function loadCanvasNative(): CanvasModule | null {
  // 1. Standard require (works in dev / non-packaged)
  try {
    return require('@napi-rs/canvas') as CanvasModule; // eslint-disable-line @typescript-eslint/no-var-requires
  } catch (e) {
    console.warn('[PriceService] Standard require falhou:', (e as Error).message);
  }

  // 2. In packaged app, load from app.asar.unpacked so native .node
  //    files are resolved outside the ASAR archive.
  try {
    const isPackaged = app && app.isPackaged;
    if (isPackaged) {
      const unpackedPaths = [
        path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', '@napi-rs', 'canvas'),
        path.join(
          path.dirname(process.execPath),
          'resources',
          'app.asar.unpacked',
          'node_modules',
          '@napi-rs',
          'canvas'
        )
      ];
      for (const p of unpackedPaths) {
        try {
          console.log('[PriceService] Tentando carregar canvas de:', p);
          return require(p) as CanvasModule;
        } catch (e) {
          console.warn('[PriceService] Falhou em', p, ':', (e as Error).message);
        }
      }
    }
  } catch (e) {
    console.warn('[PriceService] Falha na detecção de app empacotado:', (e as Error).message);
  }

  return null;
}

try {
  const canvasModule = loadCanvasNative();
  if (canvasModule) {
    createCanvas = canvasModule.createCanvas;
    loadImage = canvasModule.loadImage;
    GlobalFonts = canvasModule.GlobalFonts;
    console.log('[PriceService] @napi-rs/canvas carregado com sucesso.');
  } else {
    canvasAvailable = false;
    console.error('[PriceService] @napi-rs/canvas não encontrado em nenhum caminho.');
  }
} catch (error) {
  canvasAvailable = false;
  console.error('[PriceService] Falha ao carregar @napi-rs/canvas:', (error as Error).message);
}

class PriceService {
  private assetsDir: string;
  private fontPath: string;
  private fontFamily = 'PriceFont';
  private templates: Record<'quitado' | 'financiado', Record<'pt' | 'en' | 'es', string>>;
  private defaultTax = 320;
  private _fontRegistered = false;
  private outputDir: string;

  constructor() {
    const isPackaged = app && app.isPackaged;
    if (!isPackaged) {
      this.assetsDir = path.resolve(__dirname, '../assets');
    } else {
      const possiblePaths = [
        path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'main', 'price', 'assets'),
        path.join(process.resourcesPath, 'src', 'main', 'price', 'assets'),
        path.join(path.dirname(process.execPath), 'resources', 'app.asar.unpacked', 'src', 'main', 'price', 'assets'),
        path.join(path.dirname(process.execPath), 'resources', 'src', 'main', 'price', 'assets')
      ];

      this.assetsDir = possiblePaths.find((p) => fs.existsSync(p)) || possiblePaths[0];
      if (!fs.existsSync(this.assetsDir)) {
        console.error('[PriceService] Assets não encontrados. Caminhos testados:', possiblePaths);
      } else {
        console.log('[PriceService] Assets encontrados em:', this.assetsDir);
      }
    }

    this.fontPath = path.join(this.assetsDir, 'fonts', 'fonte.otf');
    this.templates = {
      quitado: {
        pt: path.join(this.assetsDir, 'images', 'basico.png'),
        en: path.join(this.assetsDir, 'images', 'basico_en.png'),
        es: path.join(this.assetsDir, 'images', 'basico_es.png')
      },
      financiado: {
        pt: path.join(this.assetsDir, 'images', 'full.png'),
        en: path.join(this.assetsDir, 'images', 'full_en.png'),
        es: path.join(this.assetsDir, 'images', 'full_es.png')
      }
    };

    this._ensureFontRegistered();

    this.outputDir = app.getPath('downloads');
    ensureFolder(this.outputDir);
  }

  private _ensureFontRegistered(): void {
    if (this._fontRegistered) return;
    if (!canvasAvailable || !GlobalFonts) return;
    if (!fs.existsSync(this.fontPath)) {
      console.warn(`[PriceService] Fonte não encontrada: ${this.fontPath}`);
      return;
    }
    try {
      GlobalFonts.registerFromPath(this.fontPath, this.fontFamily);
      this._fontRegistered = true;
    } catch (err) {
      console.warn('[PriceService] Falha ao registrar fonte:', (err as Error).message);
    }
  }

  getQuotes() {
    return quotesRepository.list();
  }

  upsertQuote(quote: any) {
    return quotesRepository.upsert(quote);
  }

  private _normalizeLanguage(lang: string | undefined): 'pt' | 'en' | 'es' {
    const normalized = (lang || 'pt').toLowerCase();
    if (['pt', 'en', 'es'].includes(normalized)) {
      return normalized as 'pt' | 'en' | 'es';
    }
    return 'pt';
  }

  private _pickTemplate(formType: 'quitado' | 'financiado', language?: string): string {
    const lang = this._normalizeLanguage(language);
    const collection = this.templates[formType];
    if (!collection) {
      throw new Error(`Template desconhecido para tipo ${formType}`);
    }
    return collection[lang] || collection.pt;
  }

  private _drawOverlay(ctx: CanvasRenderingContext2D, entries: OverlayEntry[]): void {
    if (!Array.isArray(entries) || !entries.length) {
      return;
    }

    ctx.textBaseline = 'top';

    entries.forEach((entry) => {
      if (!entry || typeof entry.text !== 'string' || !entry.text.trim()) {
        return;
      }

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

  private _formatOutputName(formType: string, language: string): string {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    return `${formType}-${language}-${ts}.png`;
  }

  private _applyTax(value: unknown, tax: number): number {
    return parseCurrency(value) + tax;
  }

  processQuitado(payload: Record<string, any>, taxValue: number | string | undefined) {
    const tax = Number.isFinite(taxValue as number) ? (taxValue as number) : parseCurrency(taxValue ?? this.defaultTax);

    const entradaBasico = this._applyTax(payload.entrada_basico, tax);
    const mensalBasico = payload.mensal_basico || '';
    const totalBasico = this._applyTax(payload.valor_total_basico, tax);
    const entradaCompleto = this._applyTax(payload.entrada_completo, tax);
    const mensalCompleto = payload.mensal_completo || '';
    const totalCompleto = this._applyTax(payload.valor_total_completo, tax);

    return {
      nome: payload.nome || '',
      entrada_basico: formatWithComma(entradaBasico),
      mensal_basico: mensalBasico,
      valor_total_basico: formatWithComma(totalBasico),
      entrada_completo: formatWithComma(entradaCompleto),
      mensal_completo: mensalCompleto,
      valor_total_completo: formatWithComma(totalCompleto)
    };
  }

  processFinanciado(payload: Record<string, any>, taxValue: number | string | undefined) {
    const tax = Number.isFinite(taxValue as number) ? (taxValue as number) : parseCurrency(taxValue ?? this.defaultTax);

    const entradaCompleto = this._applyTax(payload.entrada_completo, tax);
    const mensalCompleto = payload.mensal_completo || '';
    const totalCompleto = this._applyTax(payload.valor_total_completo, tax);

    return {
      nome: payload.nome || '',
      entrada_completo: formatWithComma(entradaCompleto),
      mensal_completo: mensalCompleto,
      valor_total_completo: formatWithComma(totalCompleto)
    };
  }

  private async _renderImage(templatePath: string, overlayEntries: OverlayEntry[], formType: string, language: string) {
    if (!canvasAvailable || !createCanvas || !loadImage) {
      throw new Error('Módulo nativo @napi-rs/canvas indisponível (falha ao carregar binding)');
    }
    if (!fs.existsSync(templatePath)) {
      console.error('[PriceService] Template não encontrado:', templatePath);
      console.error('[PriceService] Assets dir:', this.assetsDir);
      console.error('[PriceService] Arquivos na pasta assets:', fs.existsSync(this.assetsDir) ? fs.readdirSync(this.assetsDir) : 'pasta não existe');
      throw new Error(`Template não encontrado: ${templatePath}`);
    }

    this._ensureFontRegistered();

    let baseImage: Awaited<ReturnType<NonNullable<typeof loadImage>>> | null = null;
    let canvas: CanvasInstance | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let buffer: Buffer | null = null;
    try {
      baseImage = await loadImage(templatePath);
      const width = baseImage.width || 1600;
      const height = baseImage.height || 2000;

      canvas = createCanvas(width, height) as CanvasInstance;
      ctx = (canvas as any).getContext('2d');

      if (!ctx) {
        throw new Error('Contexto de canvas indisponível.');
      }

      ctx.drawImage(baseImage, 0, 0, width, height);
      this._drawOverlay(ctx, overlayEntries);

      ensureFolder(this.outputDir);
      const fileName = this._formatOutputName(formType, language);
      const outputPath = path.join(this.outputDir, fileName);

      buffer = (canvas as any).toBuffer ? (canvas as any).toBuffer('image/png') : null;
      if (!buffer) {
        throw new Error('Falha ao gerar buffer da imagem.');
      }
      await fs.promises.writeFile(outputPath, buffer);

      return { outputPath, fileName };
    } finally {
      buffer = null;
      ctx = null;
      canvas = null;
      baseImage = null;
      if (global.gc) {
        try {
          global.gc();
        } catch (_) {
          // ignore
        }
      }
    }
  }

  async generate(options: GenerateOptions) {
    const { formType, seguradora, idioma, taxaCotacao, apenasPrever, campos, cotacaoId } = options;

    if (!formType || !['quitado', 'financiado'].includes(formType)) {
      throw new Error('Tipo de formulário inválido.');
    }

    if (!seguradora) {
      throw new Error('Selecione uma seguradora.');
    }

    const language = this._normalizeLanguage(idioma);
    const templatePath = this._pickTemplate(formType, language);
    const tax = parseCurrency(taxaCotacao ?? this.defaultTax);

    let processed;
    let overlayEntries: OverlayEntry[];
    const Y_OFFSET = 15;

    if (formType === 'quitado') {
      processed = this.processQuitado(campos, tax);
      const X_OFFSET_LEFT = 40;
      const X_OFFSET_RIGHT = 80;

      overlayEntries = [
        { text: seguradora, x: 500, y: 543 + Y_OFFSET, size: 40, color: '#ffffff', align: 'center' },
        { text: seguradora, x: 1150, y: 543 + Y_OFFSET, size: 40, color: '#ffffff', align: 'center' },
        { text: processed.entrada_basico, x: 490 + X_OFFSET_LEFT, y: 1375 + Y_OFFSET, size: 55, color: '#000000', align: 'center' },
        { text: processed.mensal_basico, x: 500 + X_OFFSET_LEFT, y: 1525 + Y_OFFSET, size: 45, color: '#000000', align: 'center' },
        { text: processed.valor_total_basico, x: 470 + X_OFFSET_LEFT, y: 1655 + Y_OFFSET, size: 55, color: '#000000', align: 'center' },
        { text: processed.entrada_completo, x: 1120 + X_OFFSET_RIGHT, y: 1375 + Y_OFFSET, size: 55, color: '#000000', align: 'center' },
        { text: processed.mensal_completo, x: 1120 + X_OFFSET_RIGHT, y: 1520 + Y_OFFSET, size: 45, color: '#000000', align: 'center' },
        { text: processed.valor_total_completo, x: 1100 + X_OFFSET_RIGHT, y: 1655 + Y_OFFSET, size: 55, color: '#000000', align: 'center' },
        { text: processed.nome, x: 490, y: 1890 + Y_OFFSET, size: 45, color: '#ffffff', align: 'left' }
      ];
    } else {
      processed = this.processFinanciado(campos, tax);
      const X_OFFSET_CENTER = 160;

      overlayEntries = [
        { text: seguradora, x: 900, y: 552 + Y_OFFSET, size: 40, color: '#ffffff', align: 'center', maxWidth: 400 },
        { text: processed.entrada_completo, x: 800 + X_OFFSET_CENTER, y: 1400 + Y_OFFSET, size: 55, color: '#000000', align: 'center', maxWidth: 350 },
        { text: processed.mensal_completo, x: 800 + X_OFFSET_CENTER, y: 1545 + Y_OFFSET, size: 45, color: '#000000', align: 'center', maxWidth: 350 },
        { text: processed.valor_total_completo, x: 800 + X_OFFSET_CENTER, y: 1695 + Y_OFFSET, size: 55, color: '#000000', align: 'center', maxWidth: 350 },
        { text: processed.nome, x: 490, y: 1908 + Y_OFFSET, size: 45, color: '#ffffff', align: 'left', maxWidth: 800 }
      ];
    }

    const { outputPath, fileName } = await this._renderImage(templatePath, overlayEntries, formType, language);

    const quotes = this.getQuotes();
    const matchedQuote = cotacaoId ? quotes.find((item: any) => item.id === cotacaoId) : null;

    let trelloAttachment: any = null;
    if (!apenasPrever && matchedQuote?.trelloCardId) {
      try {
        trelloAttachment = await trelloService.attachFile(matchedQuote.trelloCardId, {
          path: outputPath,
          name: path.basename(outputPath)
        });
      } catch (error) {
        console.warn('[PriceService] Falha ao anexar no Trello:', (error as Error).message);
      }
    }

    return {
      success: true,
      outputPath,
      fileName,
      formType,
      language,
      processed,
      cotacao: matchedQuote || null,
      attachedToTrello: Boolean(trelloAttachment),
      trelloAttachment
    };
  }
}

const priceService = new PriceService();
export default priceService;
// CommonJS compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(module as any).exports = priceService;
