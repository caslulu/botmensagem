import React, { useState } from 'react';

interface AdminPasswordModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
  loading?: boolean;
  error?: string;
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({ open, onClose, onSubmit, loading = false, error }) => {
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!password) {
      setLocalError('Digite a senha.');
      return;
    }
    try {
      await onSubmit(password);
      setPassword('');
    } catch (e: any) {
      setLocalError(e?.message || 'Erro ao validar senha.');
    }
  };

  const handleClose = () => {
    setPassword('');
    setLocalError(null);
    onClose();
  };

  return (
    <div className={`modal-overlay fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className={`modal-content bg-white dark:bg-slate-900 p-8 rounded-2xl max-w-md w-full shadow-2xl transform transition-all duration-300 border border-slate-200 dark:border-slate-800 ${open ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        <div className="modal-header flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Acesso de Administrador</h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-3xl leading-none transition-colors">&times;</button>
        </div>
        <form className="modal-body space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Senha de administrador</label>
            <input
              type="password"
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              disabled={loading}
            />
          </div>
          {(localError || error) && <div className="text-rose-500 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg border border-rose-200 dark:border-rose-800">{localError || error}</div>}
          <div className="flex gap-3 mt-8">
            <button type="button" className="btn-secondary flex-1" onClick={handleClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn-primary flex-1 shadow-lg shadow-brand-500/20" disabled={loading}>{loading ? 'Validando…' : 'Entrar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
