
import React, { useEffect, useState } from 'react';
import { MessageModal } from './MessageModal';

export interface Message {
  id: string;
  text: string;
  imagePath?: string;
  isSelected?: boolean;
}

interface MessageManagerProps {
  profileId: string | null;
}

export const MessageManager: React.FC<MessageManagerProps> = ({ profileId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const fetchMessages = async () => {
    if (!profileId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const msgs = await window.messages?.get(profileId);
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar mensagens.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const handleSelect = async (id: string) => {
    try {
      await window.messages?.select(id);
      fetchMessages();
    } catch (e: any) {
      setError(e?.message || 'Erro ao selecionar mensagem.');
    }
  };

  const handleAdd = () => {
    setModalMode('add');
    setEditingMessage(null);
    setModalOpen(true);
  };

  const handleEdit = (msg: Message) => {
    setModalMode('edit');
    setEditingMessage(msg);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingMessage(null);
  };

  const handleModalSaved = () => {
    setModalOpen(false);
    setEditingMessage(null);
    fetchMessages();
  };

  const handleModalDeleted = () => {
    setModalOpen(false);
    setEditingMessage(null);
    fetchMessages();
  };

  const maxReached = messages.length >= 5;

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-sm">Mensagens salvas ({messages.length}/5)</span>
        <button
          className="btn-primary text-xs px-3 py-1"
          onClick={handleAdd}
          disabled={maxReached || !profileId}
        >
          + Adicionar mensagem
        </button>
      </div>
      {loading && <div className="text-slate-400">Carregando mensagens…</div>}
      {error && <div className="text-rose-400">{error}</div>}
      {!loading && !error && messages.length === 0 && (
        <div className="text-slate-400">Nenhuma mensagem salva</div>
      )}
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`message-card p-2 rounded flex items-center gap-2 ${msg.isSelected ? 'bg-blue-900/30' : 'hover:bg-slate-800'}`}
        >
          <span className="text-xs font-semibold text-slate-400">{msg.isSelected ? '✓' : ''}</span>
          <span className="flex-1 truncate text-slate-200">{msg.text.substring(0, 50)}{msg.text.length > 50 ? '…' : ''}</span>
          <div className="flex gap-1">
            {!msg.isSelected && (
              <button className="btn-secondary text-xs px-2 py-1" onClick={() => handleSelect(msg.id)}>
                Selecionar
              </button>
            )}
            <button className="btn-secondary text-xs px-2 py-1" onClick={() => handleEdit(msg)}>
              ✎ Editar
            </button>
          </div>
        </div>
      ))}
      <MessageModal
        open={modalOpen}
        mode={modalMode}
        profileId={profileId || ''}
        message={editingMessage}
        onClose={handleModalClose}
        onSaved={handleModalSaved}
        onDeleted={handleModalDeleted}
      />
    </div>
  );
};
