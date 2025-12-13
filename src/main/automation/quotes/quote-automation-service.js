const quotesRepository = require('../../price/repositories/quotesRepository');
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

  async runAutomation({ quoteId, insurer, headless, pause, keepBrowserOnError }) {
    const quote = quotesRepository.get(String(quoteId || '').trim());
    if (!quote) {
      throw new Error('Cotação não encontrada.');
    }

    const key = String(insurer || '').toLowerCase();
    const provider = this.getProvider(key);

    // Map quote to provider-specific payload
    let data = null;
    if (['liberty', 'liberty mutual', 'liberty mutual insurance'].includes(key)) {
      data = mapQuoteToLiberty(quote);
    } else {
      data = mapQuoteToProgressive(quote);
    }

    const keep = typeof keepBrowserOnError === 'boolean' ? keepBrowserOnError : (pause ? true : true);
    const result = await provider.run(data, { headless, keepBrowserOnError: keep, pause });
    return {
      provider: key || 'unknown',
      result
    };
  }
}

module.exports = new QuoteAutomationService();
