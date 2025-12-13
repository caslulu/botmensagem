const path = require('path');
const fs = require('fs');
let createCanvas, loadImage, GlobalFonts;
let canvasAvailable = true;
try {
  ({ createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas'));
} catch (error) {
  canvasAvailable = false;
  console.error('[PriceService] Falha ao carregar @napi-rs/canvas:', error.message);
}

const os = require('os');
const { app } = require('electron');
const PathResolver = require('../../automation/utils/path-resolver');
const { parseCurrency, formatWithComma } = require('../utils/number');
const quotesRepository = require('../repositories/quotesRepository');
const trelloService = require('../../trello/services/trelloService');

const DEFAULT_OUTPUT_DIR = path.join(PathResolver.getUserDataDir(), 'price', 'output');

function resolveDownloadPath(fileName) {
  const downloadDir = PathResolver.getDownloadsDir ? PathResolver.getDownloadsDir() : path.join(os.homedir(), 'Downloads');
  return path.resolve(downloadDir, fileName);
}

function ensureFolder(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

class PriceService {
  constructor() {
    // Resolve assets dir corretamente para dev vs build empacotado
    const isPackaged = app && app.isPackaged;
    if (!isPackaged) {
      this.assetsDir = path.resolve(__dirname, '../assets');
    } else {
      // No executável, tentar múltiplos caminhos possíveis
      const possiblePaths = [
        path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'main', 'price', 'assets'),
        path.join(process.resourcesPath, 'src', 'main', 'price', 'assets'),
        path.join(path.dirname(process.execPath), 'resources', 'app.asar.unpacked', 'src', 'main', 'price', 'assets'),
        path.join(path.dirname(process.execPath), 'resources', 'src', 'main', 'price', 'assets')
      ];
      
      this.assetsDir = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          this.assetsDir = p;
          console.log('[PriceService] Assets encontrados em:', p);
          break;
        }
      }
      
      if (!this.assetsDir) {
        console.error('[PriceService] Assets não encontrados. Caminhos testados:', possiblePaths);
        this.assetsDir = possiblePaths[0]; // Fallback para o primeiro
      }
    }
    
    this.fontPath = path.join(this.assetsDir, 'fonts', 'fonte.otf');
    this.fontFamily = 'PriceFont';
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

    this.defaultTax = 320;
    this._fontRegistered = false;
    this._ensureFontRegistered();
    ensureFolder(DEFAULT_OUTPUT_DIR);
  }

  _ensureFontRegistered() {
    if (this._fontRegistered) {
      return;
    }

    if (!canvasAvailable) {
      return; // Sem canvas, não tenta registrar fonte
    }
    if (!fs.existsSync(this.fontPath)) {
      console.warn(`[PriceService] Fonte não encontrada: ${this.fontPath}`);
      return;
    }
    try {
      GlobalFonts.registerFromPath(this.fontPath, this.fontFamily);
      this._fontRegistered = true;
    } catch (err) {
      console.warn('[PriceService] Falha ao registrar fonte:', err.message);
    }
  }

  getQuotes() {
    return quotesRepository.list();
  }

  upsertQuote(quote) {
    return quotesRepository.upsert(quote);
  }

  _normalizeLanguage(lang) {
    const normalized = (lang || 'pt').toLowerCase();
    if (['pt', 'en', 'es'].includes(normalized)) {
      return normalized;
    }
    return 'pt';
  }

  _pickTemplate(formType, language) {
    const lang = this._normalizeLanguage(language);
    const collection = this.templates[formType];
    if (!collection) {
      throw new Error(`Template desconhecido para tipo ${formType}`);
    }
    return collection[lang] || collection.pt;
  }

  _drawOverlay(ctx, entries) {
    if (!Array.isArray(entries) || !entries.length) {
      return;
    }

    ctx.textBaseline = 'top';

    entries.forEach((entry) => {
      if (!entry || typeof entry.text !== 'string' || !entry.text.trim()) {
        return;
      }

      const {
        text,
        x = 0,
        y = 0,
        size = 48,
        color = '#ffffff',
        weight = 500,
        align = 'left',
        maxWidth // Limite de largura para redimensionamento automático
      } = entry;

      let currentSize = size;
      const fontWeight = Number.isFinite(weight) ? String(weight) : weight || 'normal';
      
      // Define a fonte inicial
      ctx.font = `${fontWeight} ${currentSize}px "${this.fontFamily}", "Segoe UI", sans-serif`;

      // Se houver maxWidth, reduz a fonte até caber
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

  _formatOutputName(formType, language) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    return `${formType}-${language}-${ts}.png`;
  }

  _applyTax(value, tax) {
    return parseCurrency(value) + tax;
  }

  processQuitado(payload, taxValue) {
    const tax = Number.isFinite(taxValue) ? taxValue : parseCurrency(taxValue ?? this.defaultTax);

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

  processFinanciado(payload, taxValue) {
    const tax = Number.isFinite(taxValue) ? taxValue : parseCurrency(taxValue ?? this.defaultTax);

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

  async _renderImage(templatePath, overlayEntries, formType, language) {
    if (!canvasAvailable) {
      throw new Error('Módulo nativo @napi-rs/canvas indisponível (falha ao carregar binding)');
    }
    if (!fs.existsSync(templatePath)) {
      console.error('[PriceService] Template não encontrado:', templatePath);
      console.error('[PriceService] Assets dir:', this.assetsDir);
      console.error('[PriceService] Arquivos na pasta assets:', fs.existsSync(this.assetsDir) ? fs.readdirSync(this.assetsDir) : 'pasta não existe');
      throw new Error(`Template não encontrado: ${templatePath}`);
    }

    this._ensureFontRegistered();

    let baseImage = null;
    let canvas = null;
    let ctx = null;
    let buffer = null;
    try {
      baseImage = await loadImage(templatePath);
      const width = baseImage.width || 1600;
      const height = baseImage.height || 2000;

      canvas = createCanvas(width, height);
      ctx = canvas.getContext('2d');

      ctx.drawImage(baseImage, 0, 0, width, height);
      this._drawOverlay(ctx, overlayEntries);

      ensureFolder(DEFAULT_OUTPUT_DIR);
      const fileName = this._formatOutputName(formType, language);
      const outputPath = path.join(DEFAULT_OUTPUT_DIR, fileName);

      buffer = canvas.toBuffer('image/png');
      await fs.promises.writeFile(outputPath, buffer);

      return { outputPath, fileName };
    } finally {
      buffer = null;
      ctx = null;
      canvas = null;
      baseImage = null;
      if (global.gc) {
        try { global.gc(); } catch (_) {}
      }
    }
  }

  async generate(options) {
    const {
      formType,
      seguradora,
      idioma,
      taxaCotacao,
      apenasPrever,
      campos,
      cotacaoId
    } = options;

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
    let overlayEntries;
    const Y_OFFSET = 15;

    if (formType === 'quitado') {
      processed = this.processQuitado(campos, tax);
      // Ajuste de X para mover valores para a direita (evitar sobreposição com labels)
      const X_OFFSET_LEFT = 40; // Deslocamento para coluna esquerda (reduzido para centralizar na caixa)
      const X_OFFSET_RIGHT = 80; // Deslocamento para coluna direita

      overlayEntries = [
        { text: seguradora, x: 500, y: 543 + Y_OFFSET, size: 40, color: '#ffffff', align: 'center' },
        { text: seguradora, x: 1150, y: 543 + Y_OFFSET, size: 40, color: '#ffffff', align: 'center' },
        
        // Coluna Esquerda (Básico)
        { text: processed.entrada_basico, x: 490 + X_OFFSET_LEFT, y: 1375 + Y_OFFSET, size: 55, color: '#000000', align: 'center' },
        { text: processed.mensal_basico, x: 500 + X_OFFSET_LEFT, y: 1525 + Y_OFFSET, size: 45, color: '#000000', align: 'center' },
        { text: processed.valor_total_basico, x: 470 + X_OFFSET_LEFT, y: 1655 + Y_OFFSET, size: 55, color: '#000000', align: 'center' },
        
        // Coluna Direita (Completo)
        { text: processed.entrada_completo, x: 1120 + X_OFFSET_RIGHT, y: 1375 + Y_OFFSET, size: 55, color: '#000000', align: 'center' },
        { text: processed.mensal_completo, x: 1120 + X_OFFSET_RIGHT, y: 1520 + Y_OFFSET, size: 45, color: '#000000', align: 'center' },
        { text: processed.valor_total_completo, x: 1100 + X_OFFSET_RIGHT, y: 1655 + Y_OFFSET, size: 55, color: '#000000', align: 'center' },
        
        { text: processed.nome, x: 490, y: 1890 + Y_OFFSET, size: 45, color: '#ffffff', align: 'left' }
      ];
    } else {
      processed = this.processFinanciado(campos, tax);
      const X_OFFSET_CENTER = 160; // Deslocamento para coluna central

      overlayEntries = [
        { text: seguradora, x: 800 + 100, y: 552 + Y_OFFSET, size: 40, color: '#ffffff', align: 'center', maxWidth: 400 },
        
        { text: processed.entrada_completo, x: 800 + X_OFFSET_CENTER, y: 1400 + Y_OFFSET, size: 55, color: '#000000', align: 'center', maxWidth: 350 },
        { text: processed.mensal_completo, x: 800 + X_OFFSET_CENTER, y: 1545 + Y_OFFSET, size: 45, color: '#000000', align: 'center', maxWidth: 350 },
        { text: processed.valor_total_completo, x: 800 + X_OFFSET_CENTER, y: 1695 + Y_OFFSET, size: 55, color: '#000000', align: 'center', maxWidth: 350 },
        
        { text: processed.nome, x: 490, y: 1908 + Y_OFFSET, size: 45, color: '#ffffff', align: 'left', maxWidth: 800 }
      ];
    }

    const { outputPath, fileName } = await this._renderImage(templatePath, overlayEntries, formType, language);

    const downloadPath = resolveDownloadPath(fileName);
    try {
      ensureFolder(path.dirname(downloadPath));
      await fs.promises.copyFile(outputPath, downloadPath);
    } catch (error) {
      console.warn('[PriceService] Falha ao copiar para Downloads:', error.message);
    }

    const quotes = this.getQuotes();
    const matchedQuote = cotacaoId ? quotes.find((item) => item.id === cotacaoId) : null;

    let trelloAttachment = null;
    if (!apenasPrever && matchedQuote?.trelloCardId) {
      try {
        trelloAttachment = await trelloService.attachFile(matchedQuote.trelloCardId, {
          path: outputPath,
          name: path.basename(outputPath)
        });
      } catch (error) {
        console.warn('[PriceService] Falha ao anexar no Trello:', error.message);
      }
    }

    return {
      success: true,
      outputPath,
      downloadPath,
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

module.exports = new PriceService();
