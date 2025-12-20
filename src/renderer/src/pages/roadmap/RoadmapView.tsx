import React, { useMemo, useRef, useState } from 'react';

type RoadmapItem = {
  title: string;
  description: string;
  eta: string;
  label: string;
  risk?: string;
};

type Column = {
  id: 'done' | 'doing' | 'todo';
  title: string;
  tone: string;
  accent: string;
  items: RoadmapItem[];
};

const initialColumns: Column[] = [
  {
    id: 'todo',
    title: 'Planejado',
    tone: 'from-slate-500/10 via-slate-500/5 to-white',
    accent: 'text-slate-700 dark:text-slate-200',
    items: [
      {
        title: 'Novos provedores de cotação',
        description: 'Adicionar Allstate e Geico com login seguro e preenchimento guiado.',
        eta: 'Fev 2026',
        label: 'Cotações',
        risk: 'Dependência de captchas das seguradoras',
      },
      {
        title: 'Alertas proativos',
        description: 'Avisos de expiração de sessão e lembretes de tarefas em aberto.',
        eta: 'Fev 2026',
        label: 'Produtividade',
      },
      {
        title: 'Biblioteca de guias rápidos',
        description: 'Passos curtos filtrados por módulo, com busca e tags.',
        eta: 'Mar 2026',
        label: 'Educação',
      },
    ],
  },
  {
    id: 'doing',
    title: 'Em andamento',
    tone: 'from-amber-500/15 via-orange-500/10 to-white',
    accent: 'text-amber-700 dark:text-amber-300',
    items: [
      {
        title: 'Templates de preço otimizados',
        description: 'Ajustes de layout e qualidade de imagem para diferentes seguradoras.',
        eta: 'Jan 2026',
        label: 'Preço',
        risk: 'Depende da validação visual dos clientes',
      },
      {
        title: 'Monitoramento de automações',
        description: 'Logs amigáveis com avisos e instruções de correção.',
        eta: 'Jan 2026',
        label: 'Confiabilidade',
      },
    ],
  },
  {
    id: 'done',
    title: 'Entregue',
    tone: 'from-emerald-500/15 via-emerald-500/10 to-white',
    accent: 'text-emerald-700 dark:text-emerald-300',
    items: [
      {
        title: 'Painel de novidades',
        description: 'Tela dedicada para comunicar releases com imagens e passos rápidos.',
        eta: 'Dez 2025',
        label: 'UX',
      },
      {
        title: 'Roadmap em kanban',
        description: 'Quadro visível para clientes com status e estimativas.',
        eta: 'Dez 2025',
        label: 'Transparência',
      },
    ],
  },
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
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [newItem, setNewItem] = useState<{ title: string; description: string; eta: string; label: string; risk: string; column: Column['id'] }>(
    {
      title: '',
      description: '',
      eta: 'Data pendente',
      label: 'Feature',
      risk: '',
      column: 'todo',
    }
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dragRef = useRef<{ fromId: Column['id']; index: number } | null>(null);

  const summary = useMemo(() => {
    const delivered = columns.find((col) => col.id === 'done')?.items.length || 0;
    const doing = columns.find((col) => col.id === 'doing')?.items.length || 0;
    const planned = columns.find((col) => col.id === 'todo')?.items.length || 0;
    return { delivered, doing, planned };
  }, [columns]);

  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const { title, description, eta, label, risk, column } = newItem;
    if (!title.trim()) return;

    setColumns((prev) =>
      prev.map((col) =>
        col.id === column
          ? {
              ...col,
              items: [
                ...col.items,
                {
                  title: title.trim(),
                  description: description.trim() || 'Sem descrição',
                  eta: eta.trim() || 'Data pendente',
                  label: label.trim() || 'Feature',
                  risk: risk.trim() || undefined,
                },
              ],
            }
          : col
      )
    );

    setNewItem({ title: '', description: '', eta: 'Data pendente', label: 'Feature', risk: '', column });
    setShowCreateModal(false);
  };

  const handleDragStart = (fromId: Column['id'], index: number, event: React.DragEvent) => {
    dragRef.current = { fromId, index };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `${fromId}-${index}`);
  };

  const handleDragEnd = () => {
    dragRef.current = null;
  };

  const handleDrop = (toId: Column['id']) => {
    const snapshot = dragRef.current;
    if (!snapshot) return;

    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, items: [...col.items] }));
      const fromColumn = next.find((c) => c.id === snapshot.fromId);
      const toColumn = next.find((c) => c.id === toId);
      if (!fromColumn || !toColumn) return prev;

      const [moved] = fromColumn.items.splice(snapshot.index, 1);
      if (!moved) return prev;
      toColumn.items.push(moved);
      return next;
    });

    dragRef.current = null;
  };

  return (
    <div className="space-y-8">
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
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>Novo card</button>
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
              {column.items.map((item, idx) => (
                <RoadmapCard
                  key={`${column.id}-${item.title}-${idx}`}
                  {...item}
                  accent={column.accent}
                  draggable
                  onDragStart={(event) => handleDragStart(column.id, idx, event)}
                  onDragEnd={handleDragEnd}
                />
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
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Adicionar ao roadmap</h3>
                </div>
              </div>
              <button className="p-2 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white" onClick={() => setShowCreateModal(false)} aria-label="Fechar modal">✕</button>
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
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Criar card</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
