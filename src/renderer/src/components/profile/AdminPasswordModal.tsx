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
    <div className={`modal-overlay transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
      <div className={`modal-content max-w-md transform transition-all duration-300 ${open ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'}`}>
        <div className="modal-header">
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Acesso de Administrador</h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-3xl leading-none transition-colors">&times;</button>
        </div>
        <form className="modal-body space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Senha de administrador</label>
            <input
              type="password"
              className="input-control"
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
