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
      // @ts-ignore
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
        // @ts-ignore
        await window.messages?.update(message.id, text, imagePath);
      } else {
        // @ts-ignore
        await window.messages?.add(profileId, text, imagePath);
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
      // @ts-ignore
      await window.messages?.delete(message.id);
      onDeleted?.();
    } catch (e: any) {
      setError(e?.message || 'Erro ao deletar mensagem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 ${open ? '' : 'hidden'}`}>
      <div className="modal-content bg-slate-900 p-6 rounded-xl max-w-lg w-full">
        <div className="modal-header flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">{mode === 'add' ? 'Adicionar mensagem' : 'Editar mensagem'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
        </div>
        <div className="modal-body space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Texto da mensagem</label>
            <textarea
              className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              rows={3}
              value={text}
              onChange={e => setText(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Imagem (opcional)</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-2"
                placeholder="Caminho da imagem"
                value={imagePath}
                onChange={e => setImagePath(e.target.value)}
              />
              <button type="button" className="btn-secondary" onClick={handleSelectImage}>📁 Selecionar</button>
            </div>
          </div>
          {error && <div className="text-rose-400 font-semibold">{error}</div>}
        </div>
        <div className="modal-footer flex gap-3 mt-6">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          {mode === 'edit' && (
            <button className="btn-danger ml-auto" onClick={handleDelete} disabled={loading}>Deletar</button>
          )}
          <button className="btn-primary" onClick={handleSave} disabled={loading}>{loading ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
};
