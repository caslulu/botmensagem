import React, { useState, useEffect } from 'react';
import type { Profile } from './ProfileCard';

interface ProfileEditModalProps {
  open: boolean;
  profile: Profile | null;
  onClose: () => void;
  onSave: (updates: { name: string; imagePath?: string }) => void;
  loading?: boolean;
  error?: string;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ open, profile, onClose, onSave, loading = false, error }) => {
  const [name, setName] = useState('');
  const [imagePath, setImagePath] = useState('');

  useEffect(() => {
    if (open && profile) {
      setName(profile.name || '');
      setImagePath('');
    }
  }, [open, profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onSave({ name, imagePath });
  };

  return (
    <div className={`modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 ${open ? '' : 'hidden'}`}>
      <div className="modal-content bg-slate-900 p-6 rounded-xl max-w-3xl w-full">
        <div className="modal-header flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Editar perfil</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
        </div>
        <form className="modal-body space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Nome do operador</label>
              <input
                type="text"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Ex: Joana"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Identificador (fixo)</label>
              <input
                type="text"
                className="w-full rounded-lg bg-slate-900 border border-slate-800 text-slate-400 px-4 py-2"
                value={profile?.id || ''}
                disabled
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Imagem do perfil</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Selecione um arquivo de imagem ou deixe vazio para usar o avatar padrão"
                value={imagePath}
                onChange={e => setImagePath(e.target.value)}
              />
              <button
                type="button"
                className="btn-secondary whitespace-nowrap"
                onClick={async () => {
                  try {
                    // @ts-ignore
                    const result = await window.files?.selectImage();
                    if (result?.success && result.path) setImagePath(result.path);
                  } catch {}
                }}
              >
                📁 Selecionar
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Deixe vazio para usar o avatar padrão.</p>
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
        </form>
        <div className="modal-footer flex justify-end gap-2 mt-4">
          <button className="btn-secondary" type="button" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn-primary" type="submit" form="profileEditForm" disabled={loading} onClick={handleSubmit}>
            {loading ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
};
