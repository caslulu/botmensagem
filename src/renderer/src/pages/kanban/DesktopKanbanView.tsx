import React, { useCallback, useEffect, useMemo, useState } from 'react';

type KanbanCard = {
  id: string;
  columnId: string;
  title: string;
  description: string;
  payload: Record<string, any>;
  position: number;
  latestPrice?: {
    processed?: Record<string, any>;
  } | null;
};

type KanbanColumn = {
  id: string;
  title: string;
  position: number;
  cards: KanbanCard[];
};

type BoardResponse = {
  columns: KanbanColumn[];
};

type CardDraft = {
  nome: string;
  documento: string;
  documento_estado: string;
  data_nascimento: string;
  email: string;
  endereco_rua: string;
  endereco_apt: string;
  endereco_cidade: string;
  endereco_estado: string;
  endereco_zipcode: string;
  genero: string;
  estado_civil: string;
  tempo_de_seguro: string;
  tempo_no_endereco: string;
  veiculo_vin: string;
  veiculo_ano: string;
  veiculo_marca: string;
  veiculo_modelo: string;
  observacoes: string;
};

const emptyDraft: CardDraft = {
  nome: '',
  documento: '',
  documento_estado: '',
  data_nascimento: '',
  email: '',
  endereco_rua: '',
  endereco_apt: '',
  endereco_cidade: '',
  endereco_estado: '',
  endereco_zipcode: '',
  genero: '',
  estado_civil: '',
  tempo_de_seguro: '',
  tempo_no_endereco: '',
  veiculo_vin: '',
  veiculo_ano: '',
  veiculo_marca: '',
  veiculo_modelo: '',
  observacoes: ''
};

const insurers = [
  { value: 'progressive', label: 'Progressive' },
  { value: 'liberty', label: 'Liberty Mutual' }
];

function readString(...values: unknown[]): string {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

function normalizeBoard(data: any): BoardResponse {
  return {
    columns: Array.isArray(data?.columns)
      ? data.columns.map((column: KanbanColumn) => ({ ...column, cards: column.cards || [] }))
      : []
  };
}

function draftFromCard(card: KanbanCard | null): CardDraft {
  if (!card) return { ...emptyDraft };
  const payload = card.payload || {};
  const vehicle = Array.isArray(payload.veiculos) && payload.veiculos[0] ? payload.veiculos[0] : {};

  return {
    nome: readString(payload.nome, card.title),
    documento: readString(payload.documento),
    documento_estado: readString(payload.documento_estado),
    data_nascimento: readString(payload.data_nascimento),
    email: readString(payload.email),
    endereco_rua: readString(payload.endereco_rua),
    endereco_apt: readString(payload.endereco_apt),
    endereco_cidade: readString(payload.endereco_cidade),
    endereco_estado: readString(payload.endereco_estado),
    endereco_zipcode: readString(payload.endereco_zipcode),
    genero: readString(payload.genero),
    estado_civil: readString(payload.estado_civil),
    tempo_de_seguro: readString(payload.tempo_de_seguro),
    tempo_no_endereco: readString(payload.tempo_no_endereco),
    veiculo_vin: readString(vehicle.vin),
    veiculo_ano: readString(vehicle.ano),
    veiculo_marca: readString(vehicle.marca),
    veiculo_modelo: readString(vehicle.modelo),
    observacoes: readString(payload.observacoes)
  };
}

function payloadFromDraft(draft: CardDraft): Record<string, any> {
  return {
    nome: draft.nome,
    documento: draft.documento,
    documento_estado: draft.documento_estado,
    data_nascimento: draft.data_nascimento,
    email: draft.email,
    endereco_rua: draft.endereco_rua,
    endereco_apt: draft.endereco_apt,
    endereco_cidade: draft.endereco_cidade,
    endereco_estado: draft.endereco_estado,
    endereco_zipcode: draft.endereco_zipcode,
    genero: draft.genero,
    estado_civil: draft.estado_civil,
    tempo_de_seguro: draft.tempo_de_seguro,
    tempo_no_endereco: draft.tempo_no_endereco,
    observacoes: draft.observacoes,
    veiculos: [
      {
        vin: draft.veiculo_vin,
        ano: draft.veiculo_ano,
        marca: draft.veiculo_marca,
        modelo: draft.veiculo_modelo
      }
    ].filter((vehicle) => vehicle.vin || vehicle.ano || vehicle.marca || vehicle.modelo),
    pessoas: []
  };
}

async function webRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await window.desktopWebApi?.request({ method, path, body });
  if (!response?.success) {
    throw new Error(response?.error || 'Erro ao acessar a API web.');
  }
  return response.data as T;
}

function CardEditor({
  card,
  columns,
  initialColumnId,
  saving,
  onClose,
  onSave
}: {
  card: KanbanCard | null;
  columns: KanbanColumn[];
  initialColumnId: string;
  saving: boolean;
  onClose: () => void;
  onSave: (draft: CardDraft, columnId: string) => void;
}) {
  const [draft, setDraft] = useState<CardDraft>(() => draftFromCard(card));
  const [columnId, setColumnId] = useState(card?.columnId || initialColumnId || columns[0]?.id || '');

  const update = (key: keyof CardDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="modal-overlay opacity-100">
      <form
        className="modal-content max-h-[92vh] max-w-5xl overflow-hidden"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft, columnId);
        }}
      >
        <div className="modal-header">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-300">
              {card ? 'Editar cotação' : 'Nova cotação'}
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
              {draft.nome || 'Dados do card'}
            </h3>
          </div>
          <button type="button" className="btn-secondary px-3" onClick={onClose} disabled={saving}>
            Fechar
          </button>
        </div>

        <div className="modal-body max-h-[68vh] overflow-y-auto">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Coluna</span>
              <select className="input-control" value={columnId} onChange={(event) => setColumnId(event.target.value)}>
                {columns.map((column) => <option key={column.id} value={column.id}>{column.title}</option>)}
              </select>
            </label>
            <Field label="Nome completo" value={draft.nome} onChange={(value) => update('nome', value)} required />
            <Field label="Documento" value={draft.documento} onChange={(value) => update('documento', value)} />
            <Field label="Estado documento" value={draft.documento_estado} onChange={(value) => update('documento_estado', value)} />
            <Field label="Nascimento" type="date" value={draft.data_nascimento} onChange={(value) => update('data_nascimento', value)} />
            <Field label="Email" type="email" value={draft.email} onChange={(value) => update('email', value)} />
            <Field label="Rua" value={draft.endereco_rua} onChange={(value) => update('endereco_rua', value)} />
            <Field label="Apt" value={draft.endereco_apt} onChange={(value) => update('endereco_apt', value)} />
            <Field label="Cidade" value={draft.endereco_cidade} onChange={(value) => update('endereco_cidade', value)} />
            <Field label="Estado" value={draft.endereco_estado} onChange={(value) => update('endereco_estado', value)} />
            <Field label="ZIP" value={draft.endereco_zipcode} onChange={(value) => update('endereco_zipcode', value)} />
            <Field label="Genero" value={draft.genero} onChange={(value) => update('genero', value)} />
            <Field label="Estado civil" value={draft.estado_civil} onChange={(value) => update('estado_civil', value)} />
            <Field label="Tempo de seguro" value={draft.tempo_de_seguro} onChange={(value) => update('tempo_de_seguro', value)} />
            <Field label="Tempo no endereço" value={draft.tempo_no_endereco} onChange={(value) => update('tempo_no_endereco', value)} />
            <Field label="VIN" value={draft.veiculo_vin} onChange={(value) => update('veiculo_vin', value.toUpperCase())} />
            <Field label="Ano" value={draft.veiculo_ano} onChange={(value) => update('veiculo_ano', value)} />
            <Field label="Marca" value={draft.veiculo_marca} onChange={(value) => update('veiculo_marca', value)} />
            <Field label="Modelo" value={draft.veiculo_modelo} onChange={(value) => update('veiculo_modelo', value)} />
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Observações</span>
              <textarea
                className="input-control min-h-[110px]"
                value={draft.observacoes}
                onChange={(event) => update('observacoes', event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary px-5" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="btn-primary px-6" disabled={saving || !draft.nome.trim()}>
            {saving ? 'Salvando...' : 'Salvar no Kanban'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      <input className="input-control" type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export const DesktopKanbanView: React.FC = () => {
  const [board, setBoard] = useState<BoardResponse>({ columns: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedInsurer, setSelectedInsurer] = useState('progressive');
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [editingColumnId, setEditingColumnId] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await webRequest<BoardResponse>('GET', '/kanban');
      setBoard(normalizeBoard(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar Kanban.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const allCards = useMemo(() => board.columns.flatMap((column) => column.cards || []), [board.columns]);

  const openNewCard = (columnId: string) => {
    setEditingCard(null);
    setEditingColumnId(columnId);
    setShowEditor(true);
  };

  const openCard = (card: KanbanCard) => {
    setEditingCard(card);
    setEditingColumnId(card.columnId);
    setShowEditor(true);
  };

  const saveCard = async (draft: CardDraft, columnId: string) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = payloadFromDraft(draft);
      if (editingCard) {
        await webRequest<KanbanCard>('PATCH', `/kanban/cards/${editingCard.id}`, { payload });
        if (columnId && columnId !== editingCard.columnId) {
          const target = board.columns.find((column) => column.id === columnId);
          await webRequest('PATCH', `/kanban/cards/${editingCard.id}/move`, { columnId, position: target?.cards?.length || 0 });
        }
      } else {
        await webRequest<KanbanCard>('POST', '/kanban/cards', { columnId, payload });
      }
      setShowEditor(false);
      await loadBoard();
      setNotice('Card salvo no Kanban.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar card.');
    } finally {
      setSaving(false);
    }
  };

  const createColumn = async () => {
    const title = newColumnTitle.trim();
    if (!title) return;
    setSaving(true);
    setError('');
    try {
      await webRequest('POST', '/kanban/columns', { title });
      setNewColumnTitle('');
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar coluna.');
    } finally {
      setSaving(false);
    }
  };

  const renameColumn = async (column: KanbanColumn, title: string) => {
    const next = title.trim();
    if (!next || next === column.title) return;
    try {
      await webRequest('PATCH', `/kanban/columns/${column.id}`, { title: next });
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao renomear coluna.');
    }
  };

  const moveCard = async (card: KanbanCard, columnId: string) => {
    if (!columnId || columnId === card.columnId) return;
    try {
      const target = board.columns.find((column) => column.id === columnId);
      await webRequest('PATCH', `/kanban/cards/${card.id}/move`, { columnId, position: target?.cards?.length || 0 });
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao mover card.');
    }
  };

  const runQuote = async (card: KanbanCard, insurer: string = selectedInsurer) => {
    setRunningId(card.id);
    setError('');
    setNotice('');
    try {
      const payload = card.payload || {};
      const saved = await window.price?.upsertQuote?.({
        id: card.id,
        nome: readString(payload.nome, card.title),
        documento: readString(payload.documento),
        payload,
        cardId: card.id
      });

      if (saved && typeof saved === 'object' && 'success' in saved && !saved.success) {
        throw new Error(saved.error || 'Erro ao salvar espelho local da cotação.');
      }

      const result = await window.quotes?.runAutomation?.({
        quoteId: card.id,
        insurer,
        headless: false
      });

      if (result && typeof result === 'object' && 'success' in result && !result.success) {
        throw new Error(result.error || 'Erro ao iniciar cotação.');
      }
      setNotice(`Cotação iniciada para ${card.title}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar cotação.');
    } finally {
      setRunningId('');
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <section className="page-hero">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-300">
              Kanban web no desktop
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
              Cotações do banco web com automação local
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400 sm:text-base">
              O quadro usa os mesmos cards da aplicação web. No desktop, cada card também pode abrir a automação de cotação.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                Seguradora padrão
              </span>
              <select className="input-control min-w-[210px]" value={selectedInsurer} onChange={(event) => setSelectedInsurer(event.target.value)}>
                {insurers.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <button type="button" className="btn-secondary px-4" onClick={() => void loadBoard()} disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</div> : null}

      <section className="card p-4 sm:p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Quadro de cotações</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{allCards.length} card{allCards.length === 1 ? '' : 's'} sincronizados com a web.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="input-control sm:w-64"
              placeholder="Nova coluna"
              value={newColumnTitle}
              onChange={(event) => setNewColumnTitle(event.target.value)}
            />
            <button type="button" className="btn-primary px-4" onClick={() => void createColumn()} disabled={saving || !newColumnTitle.trim()}>
              Criar coluna
            </button>
          </div>
        </div>

        <div className="grid gap-4 overflow-x-auto pb-2 xl:grid-cols-3">
          {board.columns.map((column) => (
            <section key={column.id} className="min-w-[280px] rounded-[24px] border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/45">
              <header className="mb-3 flex items-center gap-2">
                <input
                  className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-900 outline-none dark:text-white"
                  defaultValue={column.title}
                  onBlur={(event) => void renameColumn(column, event.target.value)}
                />
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                  {column.cards.length}
                </span>
              </header>

              <div className="space-y-3">
                {column.cards.map((card) => {
                  const latest = card.latestPrice?.processed || {};
                  return (
                    <article key={card.id} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <button type="button" className="block w-full text-left" onClick={() => openCard(card)}>
                        <div className="flex items-start justify-between gap-3">
                          <strong className="text-sm font-semibold text-slate-900 dark:text-white">{card.title}</strong>
                          <span className="text-xs font-semibold text-brand-700 dark:text-brand-200">
                            {readString(latest.valor_total_completo, latest.valor_total_basico, 'Pendente')}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                          {card.description || readString(card.payload?.endereco_zipcode, card.payload?.documento, 'Sem resumo')}
                        </p>
                      </button>

                      <div className="mt-4 flex flex-col gap-2">
                        <select className="input-control text-sm" value={card.columnId} onChange={(event) => void moveCard(card, event.target.value)}>
                          {board.columns.map((target) => <option key={target.id} value={target.id}>{target.title}</option>)}
                        </select>
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                            Seguradora da cotação
                          </span>
                          <select
                            className="input-control text-sm"
                            value={selectedInsurer}
                            onChange={(event) => setSelectedInsurer(event.target.value)}
                          >
                            {insurers.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" className="btn-secondary min-h-[40px] px-3 text-xs" onClick={() => openCard(card)}>
                            Editar
                          </button>
                          <button type="button" className="btn-primary min-h-[40px] px-3 text-xs" onClick={() => void runQuote(card, selectedInsurer)} disabled={Boolean(runningId)}>
                            {runningId === card.id ? 'Abrindo...' : 'Iniciar cotação'}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {!column.cards.length ? (
                  <div className="rounded-[20px] border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Nenhum card nesta coluna.
                  </div>
                ) : null}
              </div>

              <button type="button" className="btn-secondary mt-3 w-full justify-center px-4" onClick={() => openNewCard(column.id)}>
                Novo card
              </button>
            </section>
          ))}
        </div>
      </section>

      {showEditor ? (
        <CardEditor
          card={editingCard}
          columns={board.columns}
          initialColumnId={editingColumnId}
          saving={saving}
          onClose={() => setShowEditor(false)}
          onSave={(draft, columnId) => void saveCard(draft, columnId)}
        />
      ) : null}
    </div>
  );
};
