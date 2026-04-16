import React, { useState } from 'react';

interface PriceFormData {
  formType: 'quitado' | 'financiado';
  seguradora: string;
  idioma: string;
  taxaCotacao: number;
  taxaType: '320' | '400' | '500' | 'custom';
  nome: string;
  entrada_basico: string;
  mensal_basico: string;
  valor_total_basico: string;
  entrada_completo: string;
  mensal_completo: string;
  valor_total_completo: string;
}

type TrelloQueueCard = {
  id: string;
  name?: string;
  desc?: string;
  shortUrl?: string;
  dateLastActivity?: string;
};

type QueueQuoteOption = {
  id: string;
  label: string;
  nome: string;
  source: 'trello-local' | 'trello' | 'local';
  payload: Record<string, any>;
  localQuoteId?: string;
  trelloCardId?: string;
  trelloCardUrl?: string;
};

const initialForm: PriceFormData = {
  formType: 'quitado',
  seguradora: 'Allstate',
  idioma: 'pt',
  taxaCotacao: 320,
  taxaType: '320',
  nome: '',
  entrada_basico: '',
  mensal_basico: '',
  valor_total_basico: '',
  entrada_completo: '',
  mensal_completo: '',
  valor_total_completo: '',
};

function readString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return '';
}

function getPayloadFields(payload: Record<string, any>): Record<string, any> {
  const candidates = [payload.campos, payload.fields, payload.data, payload.processed];
  for (const entry of candidates) {
    if (entry && typeof entry === 'object') {
      return entry;
    }
  }
  return {};
}

function parseDescriptionLine(description: string, label: string): string {
  if (!description) return '';
  const match = description.match(new RegExp(`^${label}:\\s*(.+)$`, 'im'));
  return match?.[1]?.trim() || '';
}

function parseListResponse(response: any): any[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object' && 'success' in response) {
    return response.success && Array.isArray(response.quotes) ? response.quotes : [];
  }
  return response && Array.isArray(response?.quotes) ? response.quotes : [];
}

function normalizeLocalQuote(item: any): QueueQuoteOption {
  const payload = item?.payload && typeof item.payload === 'object' ? item.payload : {};
  const fields = getPayloadFields(payload);
  const nome = readString(item?.nome, payload.nome, fields.nome) || 'Sem nome';
  const trelloCardId = readString(item?.trelloCardId);
  const trelloCardUrl = readString(item?.trelloCardUrl);

  return {
    id: `local:${item?.id}`,
    label: `${nome}${trelloCardId ? ' - Trello' : ' - Local'}`,
    nome,
    source: trelloCardId ? 'trello-local' : 'local',
    payload,
    localQuoteId: readString(item?.id),
    trelloCardId,
    trelloCardUrl
  };
}

function mergeTrelloCard(card: TrelloQueueCard, localQuote?: QueueQuoteOption): QueueQuoteOption {
  const nome = readString(card.name, localQuote?.nome) || 'Card sem nome';
  const description = readString(card.desc);
  const document = parseDescriptionLine(description, 'Documento');
  const payload = localQuote?.payload || {};

  return {
    id: `trello:${card.id}`,
    label: `${nome}${localQuote ? ' - Trello + App' : ' - Trello'}`,
    nome,
    source: localQuote ? 'trello-local' : 'trello',
    payload: localQuote
      ? payload
      : {
          nome,
          documento: document
        },
    localQuoteId: localQuote?.localQuoteId,
    trelloCardId: card.id,
    trelloCardUrl: readString(card.shortUrl, localQuote?.trelloCardUrl)
  };
}

export const PriceForm: React.FC = () => {
  const [form, setForm] = useState<PriceFormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<QueueQuoteOption[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState('');

  const loadQuotes = async () => {
    try {
      const [localResult, trelloResult] = await Promise.allSettled([
        window.price?.listQuotes(),
        window.trello?.getListCards?.({})
      ]);

      const localResponse = localResult.status === 'fulfilled' ? localResult.value : null;
      const localQuotes = parseListResponse(localResponse).map(normalizeLocalQuote);
      const localByTrelloId = new Map<string, QueueQuoteOption>();
      localQuotes.forEach((quote) => {
        if (quote.trelloCardId) {
          localByTrelloId.set(quote.trelloCardId, quote);
        }
      });

      let mergedQuotes = localQuotes;
      if (trelloResult.status === 'fulfilled') {
        const trelloResponse = trelloResult.value;
        const success = trelloResponse && typeof trelloResponse === 'object' && 'success' in trelloResponse
          ? Boolean((trelloResponse as any).success)
          : true;
        const trelloCards = success && trelloResponse && typeof trelloResponse === 'object' && Array.isArray((trelloResponse as any).cards)
          ? (trelloResponse as any).cards as TrelloQueueCard[]
          : [];

        if (trelloCards.length) {
          const usedLocalIds = new Set<string>();
          const trelloOptions = trelloCards.map((card) => {
            const localQuote = localByTrelloId.get(card.id);
            if (localQuote?.localQuoteId) {
              usedLocalIds.add(localQuote.localQuoteId);
            }
            return mergeTrelloCard(card, localQuote);
          });
          const localOnly = localQuotes.filter((quote) => quote.localQuoteId && !usedLocalIds.has(quote.localQuoteId) && !quote.trelloCardId);
          mergedQuotes = [...trelloOptions, ...localOnly];
        }
      }

      setQuotes(mergedQuotes);
    } catch (e) {
      console.error('Erro ao carregar cotações', e);
    }
  };

  React.useEffect(() => {
    loadQuotes();
  }, []);

  const handleQuoteSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const quoteId = e.target.value;
    setSelectedQuoteId(quoteId);
    if (!quoteId) return;
    
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;

    const data = quote.payload || {};
    const fields = getPayloadFields(data);
    const taxValue = readString(data.taxaCotacao, fields.taxaCotacao);

    setForm(prev => ({
        ...prev,
        nome: readString(data.nome, fields.nome, quote.nome, prev.nome),
        formType: readString(data.formType, fields.formType) === 'financiado' ? 'financiado' : prev.formType,
        seguradora: readString(data.seguradora, fields.seguradora, prev.seguradora),
        idioma: readString(data.idioma, fields.idioma, prev.idioma),
        taxaCotacao: taxValue ? Number(taxValue) : prev.taxaCotacao,
        taxaType: ['320', '400', '500'].includes(taxValue) ? taxValue as any : taxValue ? 'custom' : prev.taxaType,
        entrada_basico: readString(data.entrada_basico, fields.entrada_basico, prev.entrada_basico),
        mensal_basico: readString(data.mensal_basico, fields.mensal_basico, prev.mensal_basico),
        valor_total_basico: readString(data.valor_total_basico, fields.valor_total_basico, prev.valor_total_basico),
        entrada_completo: readString(data.entrada_completo, fields.entrada_completo, prev.entrada_completo),
        mensal_completo: readString(data.mensal_completo, fields.mensal_completo, prev.mensal_completo),
        valor_total_completo: readString(data.valor_total_completo, fields.valor_total_completo, prev.valor_total_completo)
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value as '320' | '400' | '500' | 'custom';
    setForm((prev) => ({
      ...prev,
      taxaType: value,
      taxaCotacao: value === 'custom' ? prev.taxaCotacao : Number(value)
    }));
  };

  const handleCustomTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, taxaCotacao: Number(e.target.value) }));
  };

  const handleSaveQuote = async () => {
    if (!form.nome) {
        setError('Nome do cliente é obrigatório para salvar.');
        return;
    }
    setLoading(true);
    setError(null);
    try {
        const selectedQuote = quotes.find(q => q.id === selectedQuoteId);
        const payload = {
            id: selectedQuote?.localQuoteId || selectedQuote?.trelloCardId || Date.now().toString(),
            nome: form.nome,
            trelloCardId: selectedQuote?.trelloCardId || '',
            trelloCardUrl: selectedQuote?.trelloCardUrl || '',
            payload: {
                ...form
            }
        };
        const res = await window.price?.upsertQuote(payload);
        if (res && typeof res === 'object' && 'success' in res && res.success) {
          setResult('Cotação salva com sucesso!');
          await loadQuotes();
        } else {
            setError((res as any)?.error || 'Erro ao salvar cotação.');
        }
    } catch (e: any) {
        setError(e?.message || 'Erro ao salvar cotação.');
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    
    const requiredFields = form.formType === 'quitado'
      ? ['nome', 'entrada_basico', 'mensal_basico', 'valor_total_basico', 'entrada_completo', 'mensal_completo', 'valor_total_completo']
      : ['nome', 'entrada_completo', 'mensal_completo', 'valor_total_completo'];

    const missing = requiredFields.filter(field => !form[field as keyof PriceFormData]);
    if (missing.length > 0) {
        setError('Preencha todos os campos obrigatórios.');
        setLoading(false);
        return;
    }

    try {
      const selectedQuote = quotes.find(q => q.id === selectedQuoteId);
      const payload = {
        formType: form.formType,
        seguradora: form.seguradora,
        idioma: form.idioma,
        taxaCotacao: form.taxaCotacao,
        apenasPrever: false,
        cotacaoId: selectedQuote?.localQuoteId || null,
        trelloCardId: selectedQuote?.trelloCardId || null,
        campos: {
            nome: form.nome,
            entrada_basico: form.entrada_basico,
            mensal_basico: form.mensal_basico,
            valor_total_basico: form.valor_total_basico,
            entrada_completo: form.entrada_completo,
            mensal_completo: form.mensal_completo,
            valor_total_completo: form.valor_total_completo
        }
      };

      const res = await window.price?.generate(payload);
      if (res && typeof res === 'object' && 'success' in res && res.success) {
        const path = res.result?.outputPath || res.output?.outputPath;
        setResult(`Imagem gerada: ${path || 'Arquivo salvo.'}`);
        if (path) window.lastGeneratedPricePath = path; 
      } else {
        setError((res as any)?.error || 'Erro ao gerar imagem.');
      }
    } catch (e: any) {
      setError(e?.message || 'Erro ao gerar imagem.');
    } finally {
      setLoading(false);
    }
  };

  const openFile = () => {
    // @ts-ignore
    if (window.lastGeneratedPricePath) window.files?.openPath(window.lastGeneratedPricePath);
  };

  const showInFolder = () => {
    // @ts-ignore
    if (window.lastGeneratedPricePath) window.files?.showInFolder(window.lastGeneratedPricePath);
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="rta-section">
        <div className="rta-section-header">
          <span className="rta-section-icon">💵</span>
          <div>
            <h2 className="rta-section-title">Gerar Imagem de Preço</h2>
            <p className="rta-section-description">Preencha os campos para gerar a imagem de preço.</p>
          </div>
        </div>
        
        <div className="rta-grid rta-grid-auto gap-4">
           <div className="input-group">
                <label>Cotações para fazer</label>
                <select className="input-control" onChange={handleQuoteSelect} value={selectedQuoteId}>
                    <option value="">Selecione uma cotação...</option>
                    {quotes.map((q) => (
                        <option key={q.id} value={q.id}>
                            {q.label}
                        </option>
                    ))}
                </select>
             </div>

           <div className="input-group">
              <label>Tipo</label>
              <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="formType" value="quitado" checked={form.formType === 'quitado'} onChange={handleChange} className="accent-brand-500" />
                      Quitado
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="formType" value="financiado" checked={form.formType === 'financiado'} onChange={handleChange} className="accent-brand-500" />
                      Financiado
                  </label>
              </div>
           </div>

           <div className="input-group">
              <label>Seguradora</label>
               <div className="flex gap-4 flex-wrap">
                  {['Allstate', 'Progressive', 'Geico', 'Direct', 'StateFarm', 'Liberty'].map(ins => (
                      <label key={ins} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="seguradora" value={ins} checked={form.seguradora === ins} onChange={handleChange} className="accent-brand-500" />
                          {ins}
                      </label>
                  ))}
              </div>
           </div>

           <div className="input-group">
              <label>Idioma</label>
              <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="idioma" value="pt" checked={form.idioma === 'pt'} onChange={handleChange} className="accent-brand-500" />
                      Português
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="idioma" value="en" checked={form.idioma === 'en'} onChange={handleChange} className="accent-brand-500" />
                      Inglês
                  </label>
                   <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="idioma" value="es" checked={form.idioma === 'es'} onChange={handleChange} className="accent-brand-500" />
                      Espanhol
                  </label>
              </div>
           </div>

           <div className="input-group">
              <label>Taxa de Cotação</label>
              <div className="flex gap-4 items-center flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="taxaType" value="320" checked={form.taxaType === '320'} onChange={handleTaxChange} className="accent-brand-500" />
                      $320
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="taxaType" value="400" checked={form.taxaType === '400'} onChange={handleTaxChange} className="accent-brand-500" />
                      $400
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="taxaType" value="500" checked={form.taxaType === '500'} onChange={handleTaxChange} className="accent-brand-500" />
                      $500
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="taxaType" value="custom" checked={form.taxaType === 'custom'} onChange={handleTaxChange} className="accent-brand-500" />
                      Outro
                  </label>
                  {form.taxaType === 'custom' && (
                      <input 
                          type="number" 
                          value={form.taxaCotacao} 
                          onChange={handleCustomTaxChange} 
                          className="input-control w-24 py-1 px-2" 
                          placeholder="Valor"
                      />
                  )}
              </div>
           </div>

           <div className="input-group">
              <label>Nome do Cliente</label>
              <input name="nome" value={form.nome} onChange={handleChange} className="input-control" required />
           </div>
        </div>
      </div>

      {form.formType === 'quitado' && (
          <div className="rta-section">
            <div className="rta-section-header">
              <span className="rta-section-icon">📊</span>
              <div>
                <h2 className="rta-section-title">Plano Básico</h2>
              </div>
            </div>
            <div className="rta-grid rta-grid-auto gap-4">
              <div className="input-group">
                <label>Entrada</label>
                <input name="entrada_basico" value={form.entrada_basico} onChange={handleChange} className="input-control" />
              </div>
              <div className="input-group">
                <label>Mensal</label>
                <input name="mensal_basico" value={form.mensal_basico} onChange={handleChange} className="input-control" />
              </div>
              <div className="input-group">
                <label>Total</label>
                <input name="valor_total_basico" value={form.valor_total_basico} onChange={handleChange} className="input-control" />
              </div>
            </div>
          </div>
      )}

      <div className="rta-section">
        <div className="rta-section-header">
          <span className="rta-section-icon">📈</span>
          <div>
            <h2 className="rta-section-title">Plano Completo</h2>
          </div>
        </div>
        <div className="rta-grid rta-grid-auto gap-4">
          <div className="input-group">
            <label>Entrada</label>
            <input name="entrada_completo" value={form.entrada_completo} onChange={handleChange} className="input-control" />
          </div>
          <div className="input-group">
            <label>Mensal</label>
            <input name="mensal_completo" value={form.mensal_completo} onChange={handleChange} className="input-control" />
          </div>
          <div className="input-group">
            <label>Total</label>
            <input name="valor_total_completo" value={form.valor_total_completo} onChange={handleChange} className="input-control" />
          </div>
        </div>
      </div>

      <div className="flex gap-4 mt-6 items-center flex-wrap">
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Gerando…' : 'Gerar Imagem'}</button>
        <button type="button" className="btn-secondary" onClick={handleSaveQuote} disabled={loading}>Salvar Cotação</button>
        {result && (
            <div className="flex items-center gap-4">
                <div className="text-emerald-400 font-semibold text-sm">{result}</div>
                <button type="button" className="btn-secondary text-xs px-2 py-1" onClick={openFile}>Abrir</button>
                <button type="button" className="btn-secondary text-xs px-2 py-1" onClick={showInFolder}>Pasta</button>
            </div>
        )}
        {error && <div className="text-rose-400 font-semibold text-sm">{error}</div>}
      </div>
    </form>
  );
};
