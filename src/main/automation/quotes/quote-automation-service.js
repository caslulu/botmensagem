const ProgressiveQuoteAutomation = require('./providers/progressive');
const LibertyQuoteAutomation = require('./providers/liberty');
const { mapQuoteToProgressive, mapQuoteToLiberty } = require('./data-mapper');

class QuoteAutomationService {
  constructor() {
    this.providers = {
      progressive: new ProgressiveQuoteAutomation(),
      liberty: new LibertyQuoteAutomation()
    };
  }

  getProvider(insurer) {
    const key = String(insurer || '').toLowerCase();
    if (!key) {
      throw new Error('Seguradora não informada.');
    }

    if (['progressive', 'progressiva'].includes(key)) {
      return this.providers.progressive;
    }

    if (['liberty', 'liberty mutual', 'liberty mutual insurance'].includes(key)) {
      return this.providers.liberty;
    }

    throw new Error(`Seguradora não suportada: ${insurer}`);
  }

  async runAutomation({ quoteId, quote, payload, insurer, headless, pause, keepBrowserOnError }) {
    const normalizedPayload = payload && typeof payload === 'object' ? payload : {};
    const normalizedQuote = quote && typeof quote === 'object'
      ? quote
      : {
          id: String(quoteId || '').trim() || `desktop-${Date.now()}`,
          nome: String(normalizedPayload.nome || 'Sem nome'),
          documento: String(normalizedPayload.documento || ''),
          payload: normalizedPayload
        };

    if (!normalizedQuote?.payload || typeof normalizedQuote.payload !== 'object') {
      throw new Error('Payload da cotação inválido para automação local.');
    }

    const key = String(insurer || '').toLowerCase();
    const provider = this.getProvider(key);

    // Map quote to provider-specific payload
    let data = null;
    if (['liberty', 'liberty mutual', 'liberty mutual insurance'].includes(key)) {
      data = mapQuoteToLiberty(normalizedQuote);
    } else {
      data = mapQuoteToProgressive(normalizedQuote);
    }

    const keep = typeof keepBrowserOnError === 'boolean' ? keepBrowserOnError : (pause ? true : true);
    const result = await provider.run(data, { headless, keepBrowserOnError: keep, pause });
    return {
      provider: key || 'unknown',
      result
    };
  }

  async shutdown() {
    const providers = Object.values(this.providers || {});
    await Promise.allSettled(
      providers.map(async (provider) => {
        if (provider && typeof provider.cleanup === 'function') {
          await provider.cleanup();
        }
      })
    );
  }
}

module.exports = new QuoteAutomationService();
