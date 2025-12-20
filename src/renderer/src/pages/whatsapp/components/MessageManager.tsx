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
      const res = await window.messages?.get(profileId);
      if (Array.isArray(res)) {
        setMessages(res);
      } else if (res && typeof res === 'object' && 'success' in res) {
        const payload = res as { success: boolean; messages?: Message[]; error?: string };
        if (payload.success && Array.isArray(payload.messages)) {
          setMessages(payload.messages);
        } else {
          setMessages([]);
          if (!payload.success) setError(payload.error || 'Erro ao carregar mensagens.');
        }
      } else {
        setMessages([]);
      }
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
          className={`message-card ${msg.isSelected ? 'selected' : ''}`}
        >
          <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${msg.isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
            {msg.isSelected && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <span className="flex-1 truncate text-slate-700 dark:text-slate-200 font-medium">{msg.text.substring(0, 50)}{msg.text.length > 50 ? '…' : ''}</span>
          <div className="flex gap-2">
            {!msg.isSelected && (
              <button className="message-action-btn" onClick={() => handleSelect(msg.id)} title="Selecionar">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            )}
            <button className="message-action-btn" onClick={() => handleEdit(msg)} title="Editar">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
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
