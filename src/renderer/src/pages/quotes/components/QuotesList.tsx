import React, { useEffect, useState } from 'react';
import '../quotes-board.css';
import { TrelloForm } from '../../trello/components/TrelloForm';

type RawQuote = {
  id: string;
  nome?: string;
  documento?: string;
  payload?: Record<string, unknown>;
  trelloCardId?: string;
  trelloCardUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

type TrelloQueueCard = {
  id: string;
  name?: string;
  desc?: string;
  shortUrl?: string;
  dateLastActivity?: string;
  attachmentCount?: number;
  coverUrl?: string;
};

type LocalQuote = {
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
  trelloCardId: string;
  trelloCardUrl: string;
  hasPriceData: boolean;
  summary: string;
};

type QuoteBoardItem = LocalQuote & {
  localQuoteId: string;
  source: 'trello-local' | 'trello' | 'local';
  coverUrl: string;
  attachmentCount: number;
  description: string;
  canRunAutomation: boolean;
};

type QuotePayload = Record<string, unknown>;

const QUOTE_QUEUE_BOARD_URL = 'https://trello.com/b/EwhRGV1T/auto-insurance-2.json';
const QUOTE_QUEUE_LIST_NAME = 'COTAÇÕES PARA FAZER';

const AUTOMATION_INSURERS = [
  { value: 'progressive', label: 'Progressive' },
  { value: 'liberty', label: 'Liberty' }
];

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

function formatDate(dateValue?: string): string {
  if (!dateValue) return '';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
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

function normalizeAutomationInsurer(insurer: string): string {
  const normalized = insurer.toLowerCase();
  if (normalized.includes('liberty')) return 'liberty';
  return 'progressive';
}

function buildSummary(item: {
  valorCompleto: string;
  valorBasico: string;
  valor: string;
}): string {
  if (item.valorCompleto) {
    return `Plano completo em ${item.valorCompleto}`;
  }
  if (item.valorBasico) {
    return `Plano básico em ${item.valorBasico}`;
  }
  if (item.valor) {
    return `Valor informado em ${item.valor}`;
  }
  return 'Cotação aguardando preenchimento da imagem.';
}

function parseDescriptionLine(description: string, label: string): string {
  if (!description) return '';
  const match = description.match(new RegExp(`^${label}:\\s*(.+)$`, 'im'));
  return match?.[1]?.trim() || '';
}

function mapLocalQuote(item: RawQuote): LocalQuote {
  const payload = (item.payload || {}) as QuotePayload;
  const fields = getPayloadFields(payload);
  const processed = payload.processed && typeof payload.processed === 'object'
    ? (payload.processed as QuotePayload)
    : {};

  const seguradora = readString(
    payload.seguradora,
    payload.insurance_company,
    payload.insurer,
    fields.seguradora,
    fields.insurance_company,
    fields.insurer
  );
  const valorBasico = readString(payload.valor_total_basico, fields.valor_total_basico, processed.valor_total_basico);
  const valorCompleto = readString(
    payload.valor_total_completo,
    fields.valor_total_completo,
    processed.valor_total_completo
  );
  const mensal = readString(
    payload.mensal_completo,
    fields.mensal_completo,
    payload.mensal_basico,
    fields.mensal_basico,
    processed.mensal_completo,
    processed.mensal_basico
  );
  const idioma = readString(payload.idioma, fields.idioma).toUpperCase() || 'PT';
  const taxaCotacao = readString(payload.taxaCotacao, fields.taxaCotacao) || '320';
  const formType = readString(payload.formType, fields.formType) === 'financiado' ? 'financiado' : 'quitado';
  const nome = readString(item.nome, payload.nome, fields.nome) || 'Sem nome';
  const documento = readString(item.documento, payload.documento, fields.documento);
  const valor = valorCompleto || valorBasico;

  const localQuote: LocalQuote = {
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
    trelloCardId: readString(item.trelloCardId),
    trelloCardUrl: readString(item.trelloCardUrl),
    hasPriceData: Boolean(valor || mensal),
    summary: ''
  };

  localQuote.summary = buildSummary(localQuote);
  return localQuote;
}

function mapLocalOnlyQuote(item: LocalQuote): QuoteBoardItem {
  return {
    ...item,
    localQuoteId: item.id,
    source: 'local',
    coverUrl: '',
    attachmentCount: 0,
    description: '',
    canRunAutomation: true
  };
}

function mergeTrelloCard(card: TrelloQueueCard, localQuote?: LocalQuote): QuoteBoardItem {
  const trelloName = readString(card.name);
  const trelloDescription = readString(card.desc);
  const descriptionDocument = parseDescriptionLine(trelloDescription, 'Documento');
  const local = localQuote || null;

  const mergedBase: LocalQuote = local || {
    id: card.id,
    nome: trelloName || 'Card sem nome',
    documento: descriptionDocument,
    seguradora: 'Seguradora pendente',
    valor: '',
    valorBasico: '',
    valorCompleto: '',
    mensal: '',
    idioma: 'PT',
    formType: 'quitado',
    taxaCotacao: '320',
    data: formatDate(card.dateLastActivity),
    updatedAt: formatDate(card.dateLastActivity),
    trelloCardId: card.id,
    trelloCardUrl: readString(card.shortUrl),
    hasPriceData: false,
    summary: ''
  };

  const merged: QuoteBoardItem = {
    ...mergedBase,
    nome: trelloName || mergedBase.nome,
    documento: mergedBase.documento || descriptionDocument,
    data: mergedBase.data || formatDate(card.dateLastActivity),
    updatedAt: formatDate(card.dateLastActivity) || mergedBase.updatedAt,
    trelloCardId: card.id,
    trelloCardUrl: readString(card.shortUrl) || mergedBase.trelloCardUrl,
    summary: buildSummary(mergedBase),
    localQuoteId: local?.id || '',
    source: local ? 'trello-local' : 'trello',
    coverUrl: readString(card.coverUrl),
    attachmentCount: Number(card.attachmentCount || 0),
    description: trelloDescription,
    canRunAutomation: Boolean(local?.id)
  };

  return merged;
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

function getCardSourceLabel(source: QuoteBoardItem['source']): string {
  if (source === 'trello-local') return 'Trello + App';
  if (source === 'trello') return 'Só no Trello';
  return 'Só no app';
}

function getPreviewStyle(coverUrl: string, fallbackName: string): React.CSSProperties | undefined {
  if (coverUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(8,12,5,0.1), rgba(8,12,5,0.85)), url("${coverUrl}")`
    };
  }

  const hue = Array.from(fallbackName).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  return {
    backgroundImage: `linear-gradient(135deg, hsla(${hue}, 80%, 58%, 0.25), rgba(7, 13, 9, 0.08) 55%, rgba(7, 13, 9, 0.85))`
  };
}

export const QuotesList: React.FC = () => {
  const [quotes, setQuotes] = useState<QuoteBoardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const [selected, setSelected] = useState<QuoteBoardItem | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [selectedInsurer, setSelectedInsurer] = useState<string>('progressive');
  const [boardLabel, setBoardLabel] = useState<string>(QUOTE_QUEUE_LIST_NAME);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchQuotes = async () => {
    setLoading(true);
    setError(null);
    setRunError(null);
    setSyncWarning(null);

    try {
      const [localResult, trelloResult] = await Promise.allSettled([
        window.price?.listQuotes(),
        window.trello?.getListCards?.({
          boardRef: QUOTE_QUEUE_BOARD_URL,
          listName: QUOTE_QUEUE_LIST_NAME
        })
      ]);

      const localResponse = localResult.status === 'fulfilled' ? localResult.value : null;
      const localList = Array.isArray(localResponse)
        ? localResponse
        : localResponse && typeof localResponse === 'object' && 'success' in localResponse
          ? (localResponse.success && Array.isArray((localResponse as { quotes?: RawQuote[] }).quotes)
              ? (localResponse as { quotes?: RawQuote[] }).quotes
              : [])
          : (localResponse && Array.isArray((localResponse as { quotes?: RawQuote[] }).quotes)
              ? (localResponse as { quotes?: RawQuote[] }).quotes
              : []);

      const mappedLocals = localList.map((item) => mapLocalQuote(item as RawQuote));
      const localByTrelloId = new Map<string, LocalQuote>();
      mappedLocals.forEach((quote) => {
        if (quote.trelloCardId) {
          localByTrelloId.set(quote.trelloCardId, quote);
        }
        localByTrelloId.set(quote.id, quote);
      });

      let mergedQuotes: QuoteBoardItem[] = mappedLocals.map(mapLocalOnlyQuote);

      if (trelloResult.status === 'fulfilled') {
        const trelloResponse = trelloResult.value;
        const success = Boolean(trelloResponse && typeof trelloResponse === 'object' && 'success' in trelloResponse ? trelloResponse.success : true);
        const trelloCards = success && trelloResponse && typeof trelloResponse === 'object' && Array.isArray((trelloResponse as { cards?: TrelloQueueCard[] }).cards)
          ? (trelloResponse as { cards?: TrelloQueueCard[] }).cards || []
          : [];
        const listName = trelloResponse && typeof trelloResponse === 'object' && 'listName' in trelloResponse
          ? readString((trelloResponse as { listName?: string }).listName)
          : '';

        if (listName) {
          setBoardLabel(listName);
        }

        if (!success) {
          setSyncWarning((trelloResponse as { error?: string })?.error || 'Não foi possível sincronizar a lista do Trello.');
        }

        if (trelloCards.length) {
          const usedLocals = new Set<string>();
          mergedQuotes = trelloCards.map((card) => {
            const local = localByTrelloId.get(card.id);
            if (local) {
              usedLocals.add(local.id);
            }
            return mergeTrelloCard(card, local);
          });

          const localOnly = mappedLocals
            .filter((quote) => !usedLocals.has(quote.id) && !quote.trelloCardId)
            .map(mapLocalOnlyQuote);

          mergedQuotes = [...mergedQuotes, ...localOnly];
        }
      } else {
        setSyncWarning('A lista do Trello não respondeu. Mostrando apenas o banco local.');
      }

      setQuotes(mergedQuotes);
      setSelected((prev) => {
        if (!mergedQuotes.length) return null;
        if (!prev) return mergedQuotes[0];
        return mergedQuotes.find((quote) => quote.id === prev.id) || mergedQuotes[0];
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao carregar cotações.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setSelectedInsurer(normalizeAutomationInsurer(selected.seguradora));
  }, [selected]);

  useEffect(() => {
    if (!showCreateForm) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showCreateForm]);

  const handleDelete = async (item: QuoteBoardItem) => {
    setLoading(true);
    setError(null);

    try {
      if (item.trelloCardId && window.trello?.deleteCard) {
        const trelloResponse = await window.trello.deleteCard(item.trelloCardId);
        const trelloDeleted = trelloResponse && typeof trelloResponse === 'object' && 'success' in trelloResponse
          ? Boolean(trelloResponse.success)
          : true;

        if (!trelloDeleted) {
          throw new Error((trelloResponse as { error?: string })?.error || 'Erro ao excluir card no Trello.');
        }
      }

      if (item.localQuoteId && window.price?.deleteQuote) {
        const localResponse = await window.price.deleteQuote(item.localQuoteId);
        const localDeleted = localResponse && typeof localResponse === 'object' && 'success' in localResponse
          ? Boolean(localResponse.success)
          : true;

        if (!localDeleted) {
          throw new Error((localResponse as { error?: string })?.error || 'Erro ao excluir cotação local.');
        }
      }

      await fetchQuotes();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao excluir cotação.';
      setError(message);
      setLoading(false);
    }
  };

  const handleRunAutomation = async (item: QuoteBoardItem) => {
    setRunLoading(true);
    setRunError(null);
    setError(null);

    try {
      if (!item.canRunAutomation || !item.localQuoteId) {
        throw new Error('Esse card ainda não tem espelho local no app para iniciar a automação.');
      }
      if (!window.quotes?.runAutomation) {
        throw new Error('API de automação não disponível.');
      }

      const insurer = String(selectedInsurer || 'progressive').toLowerCase();
      const res = await window.quotes.runAutomation({
        quoteId: item.localQuoteId,
        insurer,
        headless: false
      });

      if (res && typeof res === 'object' && 'success' in res && !res.success) {
        throw new Error((res as { error?: string }).error || 'Erro ao iniciar automação.');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao iniciar automação.';
      setRunError(message);
      setError(message);
    } finally {
      setRunLoading(false);
    }
  };

  return (
    <div className="quotes-board-shell">
      <section className="quotes-board-column">
        <div className="quotes-board-column__glow" aria-hidden="true" />
        <div className="quotes-board-header">
          <div>
            <p className="quotes-board-kicker">Módulo de cotações</p>
            <h2 className="quotes-board-title">Cotações</h2>
            <p className="quotes-board-intro">
              Fila sincronizada com <strong>{boardLabel}</strong> e espelho local do app.
            </p>
          </div>
          <button className="quotes-board-refresh" onClick={fetchQuotes} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        <div className="quotes-board-meta">
          <span>{quotes.length} card{quotes.length === 1 ? '' : 's'}</span>
          <span>Board: Auto Insurance 2</span>
        </div>

        {error ? <div className="quotes-board-alert quotes-board-alert--error">{error}</div> : null}
        {syncWarning ? <div className="quotes-board-alert quotes-board-alert--warning">{syncWarning}</div> : null}

        {!loading && !quotes.length ? (
          <div className="quotes-board-empty">
            <span className="quotes-board-empty__icon">+</span>
            <p>Nenhum card encontrado nessa fila.</p>
            <span>Quando entrar uma cotação nova no Trello ou no app, ela aparece aqui.</span>
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

                <div
                  className={`quotes-board-card__preview bg-gradient-to-br ${getCardTone(quote.nome)} ${quote.coverUrl ? 'has-cover' : ''}`}
                  style={getPreviewStyle(quote.coverUrl, quote.nome)}
                >
                  <div className="quotes-board-card__preview-chip">{quote.formType === 'financiado' ? 'Full' : 'Basic + Full'}</div>
                  <div className="quotes-board-card__preview-grid">
                    <div>
                      <span>Idioma</span>
                      <strong>{quote.idioma}</strong>
                    </div>
                    <div>
                      <span>Taxa</span>
                      <strong>${quote.taxaCotacao}</strong>
                    </div>
                    <div>
                      <span>Anexos</span>
                      <strong>{quote.attachmentCount}</strong>
                    </div>
                  </div>
                </div>

                <div className="quotes-board-card__footer">
                  <span>{quote.data || 'Sem data'}</span>
                  <span>{getCardSourceLabel(quote.source)}</span>
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="quotes-board-add-card"
          onClick={() => setShowCreateForm(true)}
        >
          <span>+</span>
          <span>Adicionar um card</span>
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
                {selected.canRunAutomation ? 'Pronta para rodar' : 'Só visualização'}
              </div>
            </div>

            <div className="quotes-preview-stage">
              <div className="quotes-preview-stage__toolbar">
                <span className="quotes-preview-stage__pill">{boardLabel.toLowerCase()}</span>
                <span className="quotes-preview-stage__meta">{selected.seguradora}</span>
              </div>

              <div
                className={`quotes-preview-screen ${selected.coverUrl ? 'has-cover' : ''}`}
                style={getPreviewStyle(selected.coverUrl, selected.nome)}
              >
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
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="quotes-board-actions__buttons">
                <button
                  className="quotes-board-primary"
                  onClick={() => handleRunAutomation(selected)}
                  disabled={loading || runLoading || !selected.canRunAutomation}
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

            <div className="quotes-board-details">
              <div>
                <span>Tipo</span>
                <strong>{selected.formType === 'financiado' ? 'Financiado' : 'Quitado'}</strong>
              </div>
              <div>
                <span>Idioma</span>
                <strong>{selected.idioma}</strong>
              </div>
              <div>
                <span>Taxa</span>
                <strong>${selected.taxaCotacao}</strong>
              </div>
              <div>
                <span>Origem</span>
                <strong>{getCardSourceLabel(selected.source)}</strong>
              </div>
            </div>

            {selected.description ? (
              <div className="quotes-board-description">
                <h4>Descrição do card</h4>
                <p>{selected.description}</p>
              </div>
            ) : null}
          </>
        ) : (
          <div className="quotes-board-empty quotes-board-empty--panel">
            <span className="quotes-board-empty__icon">◌</span>
            <p>Selecione uma cotação para ver o preview.</p>
            <span>Essa área já está preparada para ler a fila real do Trello.</span>
          </div>
        )}
      </section>

      {showCreateForm ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={() => setShowCreateForm(false)}
        >
          <div
            className="flex max-h-[84vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/90 px-6 py-5 dark:border-slate-800 dark:bg-slate-900/90">
              <div className="min-w-0">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                  Nova cotação
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-800 dark:text-white">
                  Criar card no Trello
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Preencha os dados da cotação em uma janela centralizada, sem apertar o board.
                </p>
              </div>
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
                onClick={() => setShowCreateForm(false)}
                aria-label="Fechar modal de criação"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
              <TrelloForm
                onSuccess={() => {
                  setShowCreateForm(false);
                  fetchQuotes();
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
