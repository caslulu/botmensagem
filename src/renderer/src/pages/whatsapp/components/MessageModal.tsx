import React, { useEffect, useState } from 'react';
import type { Message } from './MessageManager';

interface MessageModalProps {
  open: boolean;
  mode: 'add' | 'edit';
  profileId: string;
  message?: Message | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

export const MessageModal: React.FC<MessageModalProps> = ({ open, mode, profileId, message, onClose, onSaved, onDeleted }) => {
  const [text, setText] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setText(message?.text || '');
      setImagePath(message?.imagePath || '');
      setError(null);
    }
  }, [open, message]);

  const handleSelectImage = async () => {
    try {
      const result = await window.files?.selectImage();
      if (result?.success && result.path) {
        setImagePath(result.path);
      }
    } catch (e: any) {
      setError(e?.message || 'Erro ao selecionar imagem.');
    }
  };

  const handleSave = async () => {
    if (!text.trim()) {
      setError('O texto da mensagem não pode estar vazio.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (mode === 'edit' && message) {
        const res = await window.messages?.update(message.id, text, imagePath);
        if (res && typeof res === 'object' && 'success' in res && !res.success) {
          throw new Error(res.error || 'Erro ao salvar mensagem.');
        }
      } else {
        const res = await window.messages?.add(profileId, text, imagePath);
        if (res && typeof res === 'object' && 'success' in res && !res.success) {
          throw new Error(res.error || 'Erro ao salvar mensagem.');
        }
      }
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar mensagem.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!message) return;
    if (!window.confirm('Tem certeza que deseja deletar esta mensagem?')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await window.messages?.delete(message.id);
      if (res && typeof res === 'object' && 'success' in res && !res.success) {
        throw new Error(res.error || 'Erro ao deletar mensagem.');
      }
      onDeleted?.();
    } catch (e: any) {
      setError(e?.message || 'Erro ao deletar mensagem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`modal-overlay ${open ? '' : 'hidden'}`}>
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="text-xl font-semibold text-slate-800 dark:text-white">{mode === 'add' ? 'Adicionar mensagem' : 'Editar mensagem'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-2xl leading-none transition-colors">×</button>
        </div>
        <div className="modal-body space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Texto da mensagem</label>
            <textarea
              className="input-control"
              rows={3}
              value={text}
              onChange={e => setText(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Imagem (opcional)</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input-control flex-1"
                placeholder="Caminho da imagem"
                value={imagePath}
                onChange={e => setImagePath(e.target.value)}
              />
              <button type="button" className="btn-secondary" onClick={handleSelectImage}>📁 Selecionar</button>
            </div>
          </div>
          {error && <div className="text-rose-500 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg border border-rose-200 dark:border-rose-800">{error}</div>}
        </div>
        <div className="modal-footer">
          {mode === 'edit' && (
            <button className="btn-danger mr-auto" onClick={handleDelete} disabled={loading}>Deletar</button>
          )}
          <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave} disabled={loading}>{loading ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
};
