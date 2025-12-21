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
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className={`bg-white dark:bg-slate-900 p-6 rounded-xl max-w-2xl w-full shadow-xl transform transition-all duration-300 border border-slate-200 dark:border-slate-800 ${open ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Editar perfil</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nome do operador</label>
              <input
                type="text"
                className="input-control"
                placeholder="Ex: Joana"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Identificador (fixo)</label>
              <input
                type="text"
                className="input-control bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-500 cursor-not-allowed"
                value={profile?.id || ''}
                disabled
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Imagem do perfil</label>
            <div className="flex gap-3">
              <input
                type="text"
                className="input-control flex-1"
                placeholder="Selecione um arquivo de imagem ou deixe vazio para usar o avatar padrão"
                value={imagePath}
                onChange={e => setImagePath(e.target.value)}
              />
              <button
                type="button"
                className="btn-secondary whitespace-nowrap px-4"
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
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Deixe vazio para usar o avatar padrão.</p>
          </div>
          {error && <p className="text-sm text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg border border-rose-200 dark:border-rose-800">{error}</p>}
        </form>
        <div className="flex justify-end gap-3 mt-8">
          <button className="btn-secondary px-6" type="button" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn-primary px-6" type="submit" disabled={loading} onClick={handleSubmit}>
            {loading ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
};
