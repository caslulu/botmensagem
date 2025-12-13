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
    <div className={`modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 ${open ? '' : 'hidden'}`}>
      <div className="modal-content bg-slate-900 p-6 rounded-xl max-w-md w-full">
        <div className="modal-header flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Acesso de Administrador</h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
        </div>
        <form className="modal-body space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Senha de administrador</label>
            <input
              type="password"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              disabled={loading}
            />
          </div>
          {(localError || error) && <div className="text-rose-400 font-semibold">{localError || error}</div>}
          <div className="flex gap-3 mt-6">
            <button type="button" className="btn-secondary" onClick={handleClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Validando…' : 'Entrar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
