const quotesRepository = require('../../price/repositories/quotesRepository');
const ProgressiveQuoteAutomation = require('./providers/progressive');
const { mapQuoteToProgressive } = require('./data-mapper');

class QuoteAutomationService {
  constructor() {
    this.providers = {
      progressive: new ProgressiveQuoteAutomation()
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

    throw new Error(`Seguradora não suportada: ${insurer}`);
  }

  async runAutomation({ quoteId, insurer, headless }) {
    const quote = quotesRepository.get(String(quoteId || '').trim());
    if (!quote) {
      throw new Error('Cotação não encontrada.');
    }

    const provider = this.getProvider(insurer);
    const data = mapQuoteToProgressive(quote);
    const result = await provider.run(data, { headless, keepBrowserOnError: true });
    return {
      provider: 'progressive',
      result
    };
  }
}

module.exports = new QuoteAutomationService();
