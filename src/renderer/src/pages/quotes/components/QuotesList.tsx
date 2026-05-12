import React, { useEffect, useMemo, useState } from 'react';
import '../quotes-board.css';

type RawQuote = {
  id: string;
  nome?: string;
  documento?: string;
  payload?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

type QuotePayload = Record<string, unknown>;

type QuoteItem = {
  id: string;
  nome: string;
  documento: string;
  seguradora: string;
  valor: string;
  valorBasico: string;
  valorCompleto: string;
  mensal: string;
  idioma: string;
  formType: 'quitado' | 'financiado';
  taxaCotacao: string;
  data: string;
  updatedAt: string;
  hasPriceData: boolean;
  summary: string;
  payload: QuotePayload;
};

const AUTOMATION_INSURERS = [
  { value: 'progressive', label: 'Progressive' },
  { value: 'liberty', label: 'Liberty' }
];

function readString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function formatDate(dateValue?: string): string {
  if (!dateValue) return '';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getPayloadFields(payload: QuotePayload): QuotePayload {
  const candidates = [payload.campos, payload.fields, payload.data, payload.processed];
  for (const entry of candidates) {
    if (entry && typeof entry === 'object') {
      return entry as QuotePayload;
    }
  }
  return {};
}

function buildSummary(item: { valorCompleto: string; valorBasico: string; valor: string }): string {
  if (item.valorCompleto) return `Plano completo em ${item.valorCompleto}`;
  if (item.valorBasico) return `Plano básico em ${item.valorBasico}`;
  if (item.valor) return `Valor informado em ${item.valor}`;
  return 'Cotação aguardando preenchimento da imagem.';
}

function normalizeAutomationInsurer(insurer: string): string {
  const normalized = insurer.toLowerCase();
  if (normalized.includes('liberty')) return 'liberty';
  return 'progressive';
}

function mapLocalQuote(item: RawQuote): QuoteItem {
  const payload = (item.payload || {}) as QuotePayload;
  const fields = getPayloadFields(payload);
  const processed = payload.processed && typeof payload.processed === 'object'
    ? (payload.processed as QuotePayload)
    : {};

  const seguradora = readString(payload.seguradora, payload.insurance_company, payload.insurer, fields.seguradora, fields.insurance_company, fields.insurer);
  const valorBasico = readString(payload.valor_total_basico, fields.valor_total_basico, processed.valor_total_basico);
  const valorCompleto = readString(payload.valor_total_completo, fields.valor_total_completo, processed.valor_total_completo);
  const mensal = readString(payload.mensal_completo, fields.mensal_completo, payload.mensal_basico, fields.mensal_basico, processed.mensal_completo, processed.mensal_basico);
  const idioma = readString(payload.idioma, fields.idioma).toUpperCase() || 'PT';
  const taxaCotacao = readString(payload.taxaCotacao, fields.taxaCotacao) || '320';
  const formType = readString(payload.formType, fields.formType) === 'financiado' ? 'financiado' : 'quitado';
  const nome = readString(item.nome, payload.nome, fields.nome) || 'Sem nome';
  const documento = readString(item.documento, payload.documento, fields.documento);
  const valor = valorCompleto || valorBasico;

  const quote: QuoteItem = {
    id: item.id,
    nome,
    documento,
    seguradora: seguradora || 'Seguradora pendente',
    valor,
    valorBasico,
    valorCompleto,
    mensal,
    idioma,
    formType,
    taxaCotacao,
    data: formatDate(item.createdAt),
    updatedAt: formatDate(item.updatedAt),
    hasPriceData: Boolean(valor || mensal),
    summary: '',
    payload
  };

  quote.summary = buildSummary(quote);
  return quote;
}

function getInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function getCardTone(name: string): string {
  const palette = [
    'from-sky-500/20 via-blue-500/10 to-transparent',
    'from-emerald-500/20 via-teal-500/10 to-transparent',
    'from-amber-500/20 via-orange-500/10 to-transparent',
    'from-rose-500/20 via-red-500/10 to-transparent'
  ];
  const total = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[total % palette.length];
}

export const QuotesList: React.FC = () => {
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<QuoteItem | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [selectedInsurer, setSelectedInsurer] = useState<string>('progressive');

  const [showCreate, setShowCreate] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newDocumento, setNewDocumento] = useState('');

  const fetchQuotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const localResponse = await window.price?.listQuotes?.();
      const localList: RawQuote[] = Array.isArray(localResponse)
        ? localResponse
        : localResponse && typeof localResponse === 'object' && 'success' in localResponse
          ? (localResponse.success && Array.isArray((localResponse as { quotes?: RawQuote[] }).quotes)
              ? ((localResponse as { quotes?: RawQuote[] }).quotes || [])
              : [])
          : (localResponse && Array.isArray((localResponse as { quotes?: RawQuote[] }).quotes)
              ? ((localResponse as { quotes?: RawQuote[] }).quotes || [])
              : []);

      const mapped = localList.map(mapLocalQuote);
      setQuotes(mapped);
      setSelected((prev) => {
        if (!mapped.length) return null;
        if (!prev) return mapped[0];
        return mapped.find((quote) => quote.id === prev.id) || mapped[0];
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar cotações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchQuotes();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setSelectedInsurer(normalizeAutomationInsurer(selected.seguradora));
  }, [selected]);

  const totalWithPrice = useMemo(() => quotes.filter((item) => item.hasPriceData).length, [quotes]);

  const handleDelete = async (item: QuoteItem) => {
    setLoading(true);
    setError(null);
    try {
      const response = await window.price?.deleteQuote?.(item.id);
      const ok = response && typeof response === 'object'
        ? ('deleted' in response ? Boolean((response as { deleted?: boolean }).deleted) : ('success' in response ? Boolean((response as { success?: boolean }).success) : true))
        : true;
      if (!ok) {
        throw new Error((response as { error?: string })?.error || 'Erro ao excluir cotação.');
      }
      await fetchQuotes();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir cotação.');
      setLoading(false);
    }
  };

  const handleRunAutomation = async (item: QuoteItem) => {
    setRunLoading(true);
    setError(null);
    try {
      const res = await window.quotes?.runAutomation?.({
        quoteId: item.id,
        insurer: String(selectedInsurer || 'progressive').toLowerCase(),
        headless: false
      });

      if (res && typeof res === 'object' && 'success' in res && !res.success) {
        throw new Error((res as { error?: string }).error || 'Erro ao iniciar automação.');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao iniciar automação.');
    } finally {
      setRunLoading(false);
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const nome = newNome.trim();
    if (!nome) return;

    setLoading(true);
    setError(null);
    try {
      const id = `${Date.now()}`;
      const payload = {
        id,
        nome,
        documento: newDocumento.trim(),
        payload: {
          nome,
          documento: newDocumento.trim(),
          formType: 'quitado',
          taxaCotacao: '320'
        }
      };
      const res = await window.price?.upsertQuote?.(payload);
      if (res && typeof res === 'object' && 'success' in res && !res.success) {
        throw new Error((res as { error?: string }).error || 'Erro ao criar cotação.');
      }
      setShowCreate(false);
      setNewNome('');
      setNewDocumento('');
      await fetchQuotes();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao criar cotação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quotes-board-shell">
      <section className="quotes-board-column">
        <div className="quotes-board-column__glow" aria-hidden="true" />
        <div className="quotes-board-header">
          <div>
            <p className="quotes-board-kicker">Módulo de cotações</p>
            <h2 className="quotes-board-title">Cotações locais</h2>
            <p className="quotes-board-intro">Base nativa da aplicação, sem integração externa.</p>
          </div>
          <button className="quotes-board-refresh" onClick={fetchQuotes} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        <div className="quotes-board-meta">
          <span>{quotes.length} card{quotes.length === 1 ? '' : 's'}</span>
          <span>{totalWithPrice} com preço gerado</span>
        </div>

        {error ? <div className="quotes-board-alert quotes-board-alert--error">{error}</div> : null}

        {!loading && !quotes.length ? (
          <div className="quotes-board-empty">
            <span className="quotes-board-empty__icon">+</span>
            <p>Nenhuma cotação local encontrada.</p>
            <span>Crie uma nova cotação para iniciar o fluxo.</span>
          </div>
        ) : null}

        <div className="quotes-board-list">
          {quotes.map((quote) => {
            const isSelected = selected?.id === quote.id;
            return (
              <button
                key={quote.id}
                type="button"
                className={`quotes-board-card ${isSelected ? 'is-active' : ''}`}
                onClick={() => setSelected(quote)}
              >
                <div className="quotes-board-card__top">
                  <div className="quotes-board-card__avatar">{getInitials(quote.nome)}</div>
                  <div className="quotes-board-card__title-wrap">
                    <div className="quotes-board-card__title">{quote.nome}</div>
                    <div className="quotes-board-card__subtitle">{quote.seguradora}</div>
                  </div>
                  <div className="quotes-board-card__price">{quote.valor || 'Pendente'}</div>
                </div>

                <div className={`quotes-board-card__preview bg-gradient-to-br ${getCardTone(quote.nome)}`}>
                  <div className="quotes-board-card__preview-chip">{quote.formType === 'financiado' ? 'Full' : 'Basic + Full'}</div>
                  <div className="quotes-board-card__preview-grid">
                    <div><span>Idioma</span><strong>{quote.idioma}</strong></div>
                    <div><span>Taxa</span><strong>${quote.taxaCotacao}</strong></div>
                    <div><span>Status</span><strong>{quote.hasPriceData ? 'OK' : 'Pendente'}</strong></div>
                  </div>
                </div>

                <div className="quotes-board-card__footer">
                  <span>{quote.data || 'Sem data'}</span>
                  <span>Local</span>
                </div>
              </button>
            );
          })}
        </div>

        <button type="button" className="quotes-board-add-card" onClick={() => setShowCreate(true)}>
          <span>+</span>
          <span>Adicionar cotação local</span>
        </button>
      </section>

      <section className="quotes-board-panel">
        {selected ? (
          <>
            <div className="quotes-board-panel__header">
              <div>
                <p className="quotes-board-kicker">Pré-visualização</p>
                <h3 className="quotes-board-panel__title">{selected.nome}</h3>
              </div>
              <div className="quotes-board-panel__status">
                <span className={`quotes-board-dot ${selected.hasPriceData ? 'is-ready' : ''}`} />
                {selected.hasPriceData ? 'Com dados de preço' : 'Aguardando preço'}
              </div>
            </div>

            <div className="quotes-preview-stage">
              <div className="quotes-preview-stage__toolbar">
                <span className="quotes-preview-stage__pill">kanban nativo</span>
                <span className="quotes-preview-stage__meta">{selected.seguradora}</span>
              </div>

              <div className="quotes-preview-screen">
                <div className="quotes-preview-screen__brand">
                  <div className="quotes-preview-screen__badge">{getInitials(selected.nome)}</div>
                  <div>
                    <strong>{selected.nome}</strong>
                    <span>{selected.summary}</span>
                  </div>
                </div>

                <div className="quotes-preview-screen__pricing">
                  {selected.formType === 'quitado' ? (
                    <>
                      <article>
                        <span>Básico</span>
                        <strong>{selected.valorBasico || '--'}</strong>
                        <small>Mensal: {selected.mensal || '--'}</small>
                      </article>
                      <article>
                        <span>Completo</span>
                        <strong>{selected.valorCompleto || selected.valor || '--'}</strong>
                        <small>Taxa: ${selected.taxaCotacao}</small>
                      </article>
                    </>
                  ) : (
                    <article className="is-wide">
                      <span>Plano completo</span>
                      <strong>{selected.valorCompleto || selected.valor || '--'}</strong>
                      <small>Mensal: {selected.mensal || '--'}</small>
                    </article>
                  )}
                </div>
              </div>

              <div className="quotes-preview-stage__footer">
                <span>{selected.documento || 'Documento não informado'}</span>
                <span>{selected.updatedAt ? `Atualizada em ${selected.updatedAt}` : 'Sem atualização registrada'}</span>
              </div>
            </div>

            <div className="quotes-board-actions">
              <div className="quotes-board-actions__select">
                <label htmlFor="quotes-automation-insurer">Seguradora da automação</label>
                <select
                  id="quotes-automation-insurer"
                  value={selectedInsurer}
                  onChange={(event) => setSelectedInsurer(event.target.value)}
                >
                  {AUTOMATION_INSURERS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="quotes-board-actions__buttons">
                <button
                  className="quotes-board-primary"
                  onClick={() => handleRunAutomation(selected)}
                  disabled={loading || runLoading}
                >
                  {runLoading ? 'Abrindo automação...' : 'Iniciar cotação'}
                </button>
                <button
                  className="quotes-board-danger"
                  onClick={() => handleDelete(selected)}
                  disabled={loading || runLoading}
                >
                  Excluir card
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="quotes-board-empty quotes-board-empty--panel">
            <span className="quotes-board-empty__icon">◌</span>
            <p>Selecione uma cotação para ver o preview.</p>
            <span>Fluxo totalmente local e integrado ao Kanban nativo.</span>
          </div>
        )}
      </section>

      {showCreate ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <form className="w-full max-w-lg rounded-3xl border border-white/10 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950" onClick={(e) => e.stopPropagation()} onSubmit={handleCreate}>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Nova cotação local</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Crie um card base para trabalhar no Kanban nativo.</p>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Nome</span>
                <input className="input-control" value={newNome} onChange={(e) => setNewNome(e.target.value)} required />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Documento</span>
                <input className="input-control" value={newDocumento} onChange={(e) => setNewDocumento(e.target.value)} />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="btn-secondary px-4" onClick={() => setShowCreate(false)} disabled={loading}>Cancelar</button>
              <button type="submit" className="btn-primary px-5" disabled={loading}>{loading ? 'Salvando...' : 'Criar'}</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
};
