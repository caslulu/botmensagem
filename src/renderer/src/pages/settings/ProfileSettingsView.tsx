import React from 'react';

export const ProfileSettingsView: React.FC = () => {
  return (
    <section className="card p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">Perfil</h2>
        <p className="text-slate-500 dark:text-slate-300 text-sm">Gerencie dados básicos do operador.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-5 shadow-sm space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">Use o painel principal para editar ou trocar de perfil. Futuras preferências pessoais ficarão aqui.</p>
      </div>
    </section>
  );
};
