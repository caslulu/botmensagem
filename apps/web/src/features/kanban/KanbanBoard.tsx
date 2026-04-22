import { type CSSProperties, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { closestCenter, DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { FileDown, GripVertical, Plus, Trash2, X } from 'lucide-react';
import { api, downloadFile } from '../../api/client';
import type { BoardResponse, KanbanCard, KanbanColumn } from '../../types';
import { CardFormModal } from './CardFormModal';

type Props = {
  refreshKey: number;
  onCreatePrice: (card: KanbanCard) => void;
};

const cardDndId = (id: string) => `card:${id}`;
const columnDndId = (id: string) => `column:${id}`;

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function CardTile({ card, onOpen }: { card: KanbanCard; onOpen: (card: KanbanCard) => void }) {
  const draggable = useDraggable({ id: cardDndId(card.id), data: { type: 'card', cardId: card.id } });
  const droppable = useDroppable({ id: cardDndId(card.id), data: { type: 'card', cardId: card.id } });
  const setRefs = (node: HTMLElement | null) => {
    draggable.setNodeRef(node);
    droppable.setNodeRef(node);
  };
  const style = {
    transform: CSS.Translate.toString(draggable.transform),
    opacity: draggable.isDragging ? 0.45 : 1
  };
  const latest = card.latestPrice?.processed || {};

  return (
    <article
      ref={setRefs}
      className={`kanban-card ${droppable.isOver ? 'is-over' : ''}`}
      style={style}
      {...draggable.listeners}
      {...draggable.attributes}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(card)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(card);
        }
      }}
      title="Abrir card"
    >
      <header>
        <strong>{card.title}</strong>
        <span>{latest.valor_total_completo || latest.valor_total_basico || 'Pendente'}</span>
      </header>
      <p>{card.description.split('\n').slice(0, 3).join(' | ')}</p>
      <footer>
        <span>{card.files?.length || 0} anexos</span>
        {card.files?.[0] ? (
          <button
            className="inline-icon-button"
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              void downloadFile(card.files?.[0]?.downloadUrl || '', card.files?.[0]?.filename);
            }}
            title="Baixar anexo"
          >
            <FileDown size={15} />
          </button>
        ) : null}
      </footer>
    </article>
  );
}

function ColumnLane({
  column,
  onRename,
  onDelete,
  onCreateCard,
  onOpenCard
}: {
  column: KanbanColumn;
  onRename: (column: KanbanColumn, title: string) => void;
  onDelete: (column: KanbanColumn) => void;
  onCreateCard: (column: KanbanColumn) => void;
  onOpenCard: (card: KanbanCard) => void;
}) {
  const droppable = useDroppable({ id: columnDndId(column.id), data: { type: 'column', columnId: column.id } });
  const draggable = useDraggable({ id: columnDndId(column.id), data: { type: 'column', columnId: column.id } });
  const [title, setTitle] = useState(column.title);
  const setRefs = (node: HTMLElement | null) => {
    droppable.setNodeRef(node);
    draggable.setNodeRef(node);
  };
  const style: CSSProperties = {
    transform: CSS.Translate.toString(draggable.transform),
    opacity: draggable.isDragging ? 0.55 : 1,
    zIndex: draggable.isDragging ? 8 : undefined
  };

  useEffect(() => setTitle(column.title), [column.title]);

  return (
    <section
      ref={setRefs}
      className={`kanban-column ${droppable.isOver ? 'is-over' : ''} ${draggable.isDragging ? 'is-column-dragging' : ''}`}
      style={style}
    >
      <header className="column-header">
        <button
          ref={draggable.setActivatorNodeRef}
          className="column-drag-handle"
          type="button"
          title="Arrastar coluna"
          {...draggable.attributes}
          {...draggable.listeners}
        >
          <GripVertical size={16} />
        </button>
        <input
          aria-label={`Nome da coluna ${column.title}`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => title.trim() && title !== column.title && onRename(column, title)}
        />
        <span>{column.cards.length}</span>
      </header>
      <div className="column-tools">
        <button type="button" onClick={() => onDelete(column)} title="Excluir coluna vazia"><Trash2 size={15} /></button>
      </div>
      <div className="kanban-card-list">
        {column.cards.map((card) => <CardTile key={card.id} card={card} onOpen={onOpenCard} />)}
        {!column.cards.length ? <div className="empty-lane">Arraste cards para ca</div> : null}
      </div>
      <button className="column-add-card" type="button" onClick={() => onCreateCard(column)}>
        <Plus size={16} /> Card
      </button>
    </section>
  );
}

function ColumnFormModal({
  open,
  title,
  loading,
  error,
  onChange,
  onClose,
  onSubmit
}: {
  open: boolean;
  title: string;
  loading: boolean;
  error: string;
  onChange: (title: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal-sheet column-modal-sheet" onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <div>
            <p className="eyebrow">Nova coluna</p>
            <h2>Nome da coluna</h2>
          </div>
          <button type="button" className="icon-command" onClick={onClose} title="Fechar">
            <X size={18} />
          </button>
        </header>

        <div className="modal-body column-modal-body">
          <label className="modal-field-label" htmlFor="kanban-column-title">Nome</label>
          <input
            ref={inputRef}
            id="kanban-column-title"
            className="control"
            value={title}
            placeholder="Ex: Aguardando documento"
            disabled={loading}
            onChange={(event) => onChange(event.target.value)}
          />
          {error ? <div className="form-error">{error}</div> : null}
        </div>

        <footer className="modal-footer">
          <button type="button" className="secondary-button" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="submit" className="primary-button" disabled={!title.trim() || loading}>
            <Plus size={16} /> {loading ? 'Criando...' : 'Criar coluna'}
          </button>
        </footer>
      </form>
    </div>
  );
}

export function KanbanBoard({ refreshKey, onCreatePrice }: Props) {
  const [board, setBoard] = useState<BoardResponse>({ columns: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedCardColumnId, setSelectedCardColumnId] = useState('');
  const [selectedCardId, setSelectedCardId] = useState('');
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [creatingColumn, setCreatingColumn] = useState(false);
  const [columnError, setColumnError] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setBoard(await api.get<BoardResponse>('/kanban'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar Kanban.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard, refreshKey]);

  const cardById = useMemo(() => {
    const map = new Map<string, { card: KanbanCard; column: KanbanColumn; cardIndex: number; columnIndex: number }>();
    board.columns.forEach((column, columnIndex) => {
      column.cards.forEach((card, cardIndex) => map.set(cardDndId(card.id), { card, column, cardIndex, columnIndex }));
    });
    return map;
  }, [board.columns]);

  const columnById = useMemo(() => {
    const map = new Map<string, { column: KanbanColumn; index: number }>();
    board.columns.forEach((column, index) => map.set(columnDndId(column.id), { column, index }));
    return map;
  }, [board.columns]);

  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    for (const column of board.columns) {
      const card = column.cards.find((item) => item.id === selectedCardId);
      if (card) return card;
    }
    return null;
  }, [board.columns, selectedCardId]);

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!event.over) return;

    const overId = String(event.over.id);
    const activeType = event.active.data.current?.type;

    if (activeType === 'column') {
      const activeColumn = columnById.get(String(event.active.id));
      const overColumn = columnById.get(overId);
      const overCard = cardById.get(overId);
      const targetColumn = overColumn?.column || overCard?.column;
      const targetColumnIndex = overColumn?.index ?? overCard?.columnIndex;
      if (!activeColumn || !targetColumn || targetColumnIndex === undefined || activeColumn.column.id === targetColumn.id) return;

      const nextColumns = moveItem(board.columns, activeColumn.index, targetColumnIndex);
      setBoard((prev) => ({
        ...prev,
        columns: nextColumns.map((column, position) => ({ ...column, position }))
      }));

      try {
        await api.patch(`/kanban/columns/${activeColumn.column.id}`, { position: targetColumnIndex });
        await loadBoard();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao mover coluna.');
        await loadBoard();
      }
      return;
    }

    const activeCard = cardById.get(String(event.active.id));
    if (!activeCard) return;

    const overCard = cardById.get(overId);
    const targetColumn = overCard?.column || columnById.get(overId)?.column;
    if (!targetColumn) return;

    const position = overCard ? overCard.cardIndex : targetColumn.cards.length;
    try {
      await api.patch(`/kanban/cards/${activeCard.card.id}/move`, { columnId: targetColumn.id, position });
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao mover card.');
    }
  };

  const closeColumnModal = () => {
    if (creatingColumn) return;
    setShowColumnModal(false);
    setNewColumnTitle('');
    setColumnError('');
  };

  const createColumn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newColumnTitle.trim();
    if (!title || creatingColumn) return;

    setCreatingColumn(true);
    setColumnError('');
    try {
      await api.post('/kanban/columns', { title });
      setNewColumnTitle('');
      setShowColumnModal(false);
      await loadBoard();
    } catch (err) {
      setColumnError(err instanceof Error ? err.message : 'Erro ao criar coluna.');
    } finally {
      setCreatingColumn(false);
    }
  };

  const renameColumn = async (column: KanbanColumn, title: string) => {
    await api.patch(`/kanban/columns/${column.id}`, { title });
    await loadBoard();
  };

  const deleteColumn = async (column: KanbanColumn) => {
    try {
      await api.delete(`/kanban/columns/${column.id}`);
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A coluna precisa estar vazia.');
    }
  };

  const openCardModal = (column: KanbanColumn) => {
    setSelectedCardId('');
    setSelectedCardColumnId(column.id);
    setShowCardModal(true);
  };

  const openExistingCard = (card: KanbanCard) => {
    setSelectedCardId(card.id);
    setSelectedCardColumnId(card.columnId);
    setShowCardModal(true);
  };

  const closeCardModal = () => {
    setShowCardModal(false);
    setSelectedCardColumnId('');
    setSelectedCardId('');
  };

  const createPriceForCard = (card: KanbanCard) => {
    closeCardModal();
    onCreatePrice(card);
  };

  return (
    <div className="kanban-page">
      <section className="command-band kanban-action-band" aria-label="Ações do quadro de cotações">
        <div className="command-row">
          <button className="secondary-button" type="button" onClick={() => setShowColumnModal(true)}>
            <Plus size={16} /> Coluna
          </button>
        </div>
      </section>

      {error ? <div className="notice-error">{error}</div> : null}
      {loading ? <div className="loading-strip">Carregando quadro...</div> : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="kanban-scroll">
          {board.columns.map((column) => (
            <ColumnLane
              key={column.id}
              column={column}
              onRename={renameColumn}
              onDelete={deleteColumn}
              onCreateCard={openCardModal}
              onOpenCard={openExistingCard}
            />
          ))}
        </div>
      </DndContext>

      <ColumnFormModal
        open={showColumnModal}
        title={newColumnTitle}
        loading={creatingColumn}
        error={columnError}
        onChange={setNewColumnTitle}
        onClose={closeColumnModal}
        onSubmit={createColumn}
      />

      <CardFormModal
        open={showCardModal}
        columns={board.columns}
        initialColumnId={selectedCardColumnId}
        card={selectedCard}
        onClose={closeCardModal}
        onSaved={loadBoard}
        onCreatePrice={createPriceForCard}
      />
    </div>
  );
}
