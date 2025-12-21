import React, { useEffect, useMemo, useRef, useState } from 'react';

type RoadmapStatus = 'todo' | 'doing' | 'done';

type RoadmapItem = {
  id: string;
  title: string;
  description: string;
  eta: string;
  label: string;
  risk?: string;
  status: RoadmapStatus;
  position: number;
};

type Column = {
  id: RoadmapStatus;
  title: string;
  tone: string;
  accent: string;
  items: RoadmapItem[];
};
const seedItems: RoadmapItem[] = [
  {
    id: 'seed-todo-1',
    title: 'Novos provedores de cotação',
    description: 'Adicionar Allstate e Geico com login seguro e preenchimento guiado.',
    eta: 'Fev 2026',
    label: 'Cotações',
    risk: 'Dependência de captchas das seguradoras',
    status: 'todo',
    position: 1
  },
  {
    id: 'seed-todo-2',
    title: 'Alertas proativos',
    description: 'Avisos de expiração de sessão e lembretes de tarefas em aberto.',
    eta: 'Fev 2026',
    label: 'Produtividade',
    status: 'todo',
    position: 2
  },
  {
    id: 'seed-todo-3',
    title: 'Biblioteca de guias rápidos',
    description: 'Passos curtos filtrados por módulo, com busca e tags.',
    eta: 'Mar 2026',
    label: 'Educação',
    status: 'todo',
    position: 3
  },
  {
    id: 'seed-doing-1',
    title: 'Templates de preço otimizados',
    description: 'Ajustes de layout e qualidade de imagem para diferentes seguradoras.',
    eta: 'Jan 2026',
    label: 'Preço',
    risk: 'Depende da validação visual dos clientes',
    status: 'doing',
    position: 1
  },
  {
    id: 'seed-doing-2',
    title: 'Monitoramento de automações',
    description: 'Logs amigáveis com avisos e instruções de correção.',
    eta: 'Jan 2026',
    label: 'Confiabilidade',
    status: 'doing',
    position: 2
  },
  {
    id: 'seed-done-1',
    title: 'Painel de novidades',
    description: 'Tela dedicada para comunicar releases com imagens e passos rápidos.',
    eta: 'Dez 2025',
    label: 'UX',
    status: 'done',
    position: 1
  },
  {
    id: 'seed-done-2',
    title: 'Roadmap em kanban',
    description: 'Quadro visível para clientes com status e estimativas.',
    eta: 'Dez 2025',
    label: 'Transparência',
    status: 'done',
    position: 2
  }
];

const SummaryBadge: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="px-4 py-3 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-white/40 dark:border-slate-800 shadow-sm">
    <p className="text-xs uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</p>
    <p className="text-xl font-semibold text-slate-900 dark:text-white">{value}</p>
  </div>
);

type DraggableCardProps = RoadmapItem & {
  accent: string;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: () => void;
};

const RoadmapCard: React.FC<DraggableCardProps> = ({ title, description, eta, label, risk, accent, draggable, onDragStart, onDragEnd }) => (
  <article
    className="rounded-xl border border-slate-200/70 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 p-4 shadow-sm space-y-2 cursor-grab active:cursor-grabbing"
    draggable={draggable}
    onDragStart={onDragStart}
    onDragEnd={onDragEnd}
  >
    <div className="flex items-center justify-between gap-2">
      <span className={`text-xs font-semibold px-2 py-1 rounded-full bg-black/5 dark:bg-white/5 ${accent}`}>{label}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400">{eta}</span>
    </div>
    <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">{title}</h4>
    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{description}</p>
    {risk && <div className="text-xs text-amber-600 dark:text-amber-300">Risco: {risk}</div>}
  </article>
);

export const RoadmapView: React.FC = () => {
  const buildColumns = (items: RoadmapItem[]): Column[] => {
    const groups: Record<RoadmapStatus, RoadmapItem[]> = { todo: [], doing: [], done: [] };
    items.forEach((item) => {
      const status = (item.status as RoadmapStatus) || 'todo';
      groups[status] = groups[status] || [];
      groups[status].push(item);
    });

    return [
      { id: 'todo', title: 'Planejado', tone: 'from-slate-500/10 via-slate-500/5 to-white', accent: 'text-slate-700 dark:text-slate-200', items: groups.todo.sort((a, b) => (a.position || 0) - (b.position || 0)) },
      { id: 'doing', title: 'Em andamento', tone: 'from-amber-500/15 via-orange-500/10 to-white', accent: 'text-amber-700 dark:text-amber-300', items: groups.doing.sort((a, b) => (a.position || 0) - (b.position || 0)) },
      { id: 'done', title: 'Entregue', tone: 'from-emerald-500/15 via-emerald-500/10 to-white', accent: 'text-emerald-700 dark:text-emerald-300', items: groups.done.sort((a, b) => (a.position || 0) - (b.position || 0)) }
    ];
  };

  const getInitialNewItem = () => ({
    title: '',
    description: '',
    eta: 'Data pendente',
    label: 'Feature',
    risk: '',
    column: 'todo' as Column['id'],
  });

  const [columns, setColumns] = useState<Column[]>(buildColumns(seedItems));
  const [newItem, setNewItem] = useState<{ title: string; description: string; eta: string; label: string; risk: string; column: Column['id'] }>(getInitialNewItem);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setNewItem(getInitialNewItem());
    setEditingItem(null);
    setShowCreateModal(false);
  };
  const dragRef = useRef<{ fromId: Column['id']; index: number } | null>(null);
  const dragItemIdRef = useRef<string | null>(null);

  const loadItems = async () => {
    try {
      const res = await window.roadmap?.list?.();
      const items = res && res.success ? (res.items || []) : [];
      if (Array.isArray(items) && items.length > 0) {
        setColumns(buildColumns(items as RoadmapItem[]));
      } else {
        setColumns(buildColumns(seedItems));
      }
    } catch (error) {
      setColumns(buildColumns(seedItems));
      setError('Não foi possível carregar o roadmap.');
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const summary = useMemo(() => {
    const delivered = columns.find((col) => col.id === 'done')?.items.length || 0;
    const doing = columns.find((col) => col.id === 'doing')?.items.length || 0;
    const planned = columns.find((col) => col.id === 'todo')?.items.length || 0;
    return { delivered, doing, planned };
  }, [columns]);

  const handleAddItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    const { title, description, eta, label, risk, column } = newItem;
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      eta: eta.trim(),
      label: label.trim(),
      risk: risk.trim(),
      status: column
    };

    try {
      if (editingItem) {
        const res = await window.roadmap?.update?.({ id: editingItem.id, ...payload });
        const item = res && res.success ? res.item : null;
        if (item) {
          setColumns((prev) => buildColumns([...prev.flatMap((c) => c.items).filter((it) => it.id !== item.id), item as RoadmapItem]));
        }
      } else {
        const res = await window.roadmap?.create?.(payload);
        const item = res && res.success ? res.item : null;
        if (item) {
          setColumns((prev) => buildColumns([...prev.flatMap((c) => c.items), item as RoadmapItem]));
        }
      }
    } catch (error) {
      // fallback no-op; UI remains unchanged on error
      setError('Não foi possível salvar o card.');
    }

    resetForm();
  };

  const handleDragStart = (fromId: Column['id'], itemId: string, event: React.DragEvent) => {
    dragRef.current = { fromId, index: 0 };
    dragItemIdRef.current = itemId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `${fromId}-${itemId}`);
  };

  const handleDragEnd = () => {
    dragRef.current = null;
  };

  const handleDrop = async (toId: Column['id']) => {
    const itemId = dragItemIdRef.current;
    if (!dragRef.current || !itemId) return;

    setColumns((prev) => {
      const flat = prev.flatMap((c) => c.items);
      const item = flat.find((it) => it.id === itemId);
      if (!item) return prev;
      const updated: RoadmapItem = { ...item, status: toId };
      const others = flat.filter((it) => it.id !== itemId);
      return buildColumns([...others, updated]);
    });

    try {
      const res = await window.roadmap?.updateStatus?.({ id: itemId, status: toId });
      const updatedItem = res && res.success ? res.item : null;
      if (updatedItem) {
        setColumns((prev) => {
          const others = prev.flatMap((c) => c.items).filter((it) => it.id !== itemId);
          return buildColumns([...others, updatedItem as RoadmapItem]);
        });
      }
    } catch (error) {
      // If it fails, we won't revert immediately; reload can recover
      setError('Não foi possível mover o card.');
    }

    dragRef.current = null;
    dragItemIdRef.current = null;
  };

  const handleEdit = (item: RoadmapItem) => {
    setEditingItem(item);
    setNewItem({
      title: item.title,
      description: item.description,
      eta: item.eta,
      label: item.label,
      risk: item.risk || '',
      column: item.status
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (item: RoadmapItem) => {
    setError(null);
    try {
      const res = await window.roadmap?.delete?.({ id: item.id });
      const success = res && typeof res === 'object' && 'success' in res ? Boolean((res as any).success) : true;
      const deleted = res && typeof res === 'object' && 'deleted' in res ? Boolean((res as any).deleted) : success;
      if (!success || !deleted) {
        throw new Error((res as any)?.error || 'Erro ao excluir card.');
      }

      setColumns((prev) => buildColumns(prev.flatMap((c) => c.items).filter((it) => it.id !== item.id)));
      await loadItems();
      resetForm();
      return;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível excluir o card.');
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200 px-4 py-3">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-white/40 dark:border-slate-800 bg-gradient-to-br from-slate-900/80 via-brand-500/10 to-slate-50 dark:from-slate-900 dark:via-brand-500/10 dark:to-slate-950 shadow-xl p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.08em] text-brand-100 font-semibold">Roadmap</p>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white leading-tight">Planejado primeiro, entregue por último</h2>
            <p className="text-base text-slate-700 dark:text-slate-200 max-w-2xl">
              Organize ideias, mova cartões entre colunas e registre novos itens diretamente no quadro.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 min-w-[260px]">
            <SummaryBadge label="Planejados" value={`${summary.planned}`} />
            <SummaryBadge label="Em andamento" value={`${summary.doing}`} />
            <SummaryBadge label="Entregues" value={`${summary.delivered}`} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Adicionar item ao kanban</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Abrir modal no estilo Trello para criar um card.</p>
          </div>
          <button className="btn-primary" onClick={() => { setEditingItem(null); setNewItem(getInitialNewItem()); setShowCreateModal(true); }}>Novo card</button>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {columns.map((column) => (
          <div
            key={column.id}
            className="space-y-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(column.id);
            }}
          >
            <div className={`rounded-2xl p-4 border border-white/50 dark:border-slate-800 bg-gradient-to-br ${column.tone} shadow-sm`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{column.title}</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">{column.items.length} itens</span>
              </div>
            </div>
            <div className="space-y-3 min-h-[120px]">
              {column.items.map((item) => (
                <div key={item.id} onClick={() => handleEdit(item)} role="button" className="group">
                  <RoadmapCard
                    {...item}
                    accent={column.accent}
                    draggable
                    onDragStart={(event) => handleDragStart(column.id, item.id, event)}
                    onDragEnd={handleDragEnd}
                  />
                </div>
              ))}
              {column.items.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300/70 dark:border-slate-800/80 p-4 text-sm text-slate-500 dark:text-slate-400 text-center">
                  Arraste algo para cá ou adicione um item.
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-7 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200 flex items-center justify-center text-lg">🗂️</span>
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Novo card</p>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{editingItem ? 'Editar card' : 'Adicionar ao roadmap'}</h3>
                </div>
              </div>
              <button
                className="p-2 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
                onClick={resetForm}
                aria-label="Fechar modal"
              >
                ✕
              </button>
            </div>

            <form className="space-y-5" onSubmit={handleAddItem}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Título</label>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 px-4 py-3">
                  <input
                    className="bg-transparent w-full outline-none text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    autoFocus
                    placeholder="Ex: Integração com Geico"
                    value={newItem.title}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Descrição (opcional)</label>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 px-4 py-3">
                  <textarea
                    className="bg-transparent w-full outline-none text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 min-h-[120px]"
                    placeholder="Conte brevemente o objetivo do card"
                    value={newItem.description}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Coluna</label>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 px-3 py-2.5">
                    <select
                      className="bg-transparent w-full outline-none text-sm text-slate-800 dark:text-slate-100"
                      value={newItem.column}
                      onChange={(e) => setNewItem((prev) => ({ ...prev, column: e.target.value as Column['id'] }))}
                    >
                      <option value="todo">Planejado</option>
                      <option value="doing">Em andamento</option>
                      <option value="done">Entregue</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Estimativa</label>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 px-3 py-2.5">
                    <input
                      className="bg-transparent w-full outline-none text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      placeholder="Ex: Jan 2026"
                      value={newItem.eta}
                      onChange={(e) => setNewItem((prev) => ({ ...prev, eta: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Etiqueta</label>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 px-3 py-2.5">
                    <input
                      className="bg-transparent w-full outline-none text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      placeholder="Ex: UX, Produto"
                      value={newItem.label}
                      onChange={(e) => setNewItem((prev) => ({ ...prev, label: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Risco (opcional)</label>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 px-3 py-2.5">
                  <input
                    className="bg-transparent w-full outline-none text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    placeholder="Ex: Dependência de homologação do cliente"
                    value={newItem.risk}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, risk: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                {editingItem && (
                  <button type="button" className="btn-danger" onClick={() => handleDelete(editingItem)}>Excluir</button>
                )}
                <button type="button" className="btn-secondary" onClick={resetForm}>Cancelar</button>
                <button type="submit" className="btn-primary">{editingItem ? 'Salvar alterações' : 'Criar card'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
