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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-slate-500 dark:text-slate-400">Mensagens salvas ({messages.length}/5)</span>
        <button
          className="btn-primary text-xs px-3 py-2"
          onClick={handleAdd}
          disabled={maxReached || !profileId}
        >
          + Adicionar mensagem
        </button>
      </div>
      {loading && <div className="text-sm text-slate-400">Carregando mensagens…</div>}
      {error && <div className="rounded-3xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</div>}
      {!loading && !error && messages.length === 0 && (
        <div className="surface-subtle text-sm text-slate-500 dark:text-slate-400">Nenhuma mensagem salva para este usuário.</div>
      )}
      <div className="custom-scrollbar max-h-[30rem] space-y-3 overflow-y-auto pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message-card ${msg.isSelected ? 'selected' : ''}`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${msg.isSelected ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                {msg.isSelected ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">
                  {msg.isSelected ? 'Mensagem ativa' : 'Mensagem salva'}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {msg.text.substring(0, 140)}{msg.text.length > 140 ? '…' : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!msg.isSelected ? (
                <button className="message-action-btn" onClick={() => handleSelect(msg.id)} title="Selecionar">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              ) : null}
              <button className="message-action-btn" onClick={() => handleEdit(msg)} title="Editar">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
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
