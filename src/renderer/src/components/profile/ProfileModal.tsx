import React, { useState } from 'react';
import type { Profile } from './ProfileCard';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (profile: Omit<Profile, 'thumbnail'> & { imagePath?: string }) => void;
  loading?: boolean;
  error?: string;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ open, onClose, onSave, loading = false, error }) => {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !id) return;
    onSave({ id, name, isAdmin, imagePath });
  };

  React.useEffect(() => {
    if (open) {
      setName('');
      setId('');
      setImagePath('');
      setIsAdmin(false);
    }
  }, [open]);

  return (
    <div className={`modal-overlay transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
      <div className={`modal-content transform transition-all duration-300 ${open ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'}`}>
        <div className="modal-header">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Adicionar novo perfil</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form id="profileForm" className="modal-body space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nome do operador</label>
              <input
                type="text"
                className="input-control"
                placeholder="Ex: Joana"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  if (!id) setId(slugify(e.target.value));
                }}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Identificador interno</label>
              <input
                type="text"
                className="input-control"
                placeholder="use apenas letras, números ou hífen"
                value={id}
                onChange={e => setId(slugify(e.target.value))}
                required
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Esse identificador precisa ser único e será usado para salvar sessões.</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Imagem do perfil (opcional)</label>
            <div className="flex gap-3">
              <input
                type="text"
                className="input-control flex-1"
                placeholder="Selecione um arquivo de imagem ou deixe em branco"
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
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Formatos aceitos: PNG ou JPG. Se não escolher, aplicaremos um avatar padrão.</p>
          </div>
          <label className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <input 
              type="checkbox" 
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" 
              checked={isAdmin} 
              onChange={e => setIsAdmin(e.target.checked)} 
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Definir este operador como administrador (libera disparos automáticos)</span>
          </label>
          {error && <p className="text-sm text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg border border-rose-200 dark:border-rose-800">{error}</p>}
        </form>
        <div className="modal-footer">
          <button className="btn-secondary px-6" type="button" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn-primary px-6 shadow-lg shadow-brand-500/20" type="submit" form="profileForm" disabled={loading}>
            {loading ? 'Criando…' : 'Criar perfil'}
          </button>
        </div>
      </div>
    </div>
  );
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
