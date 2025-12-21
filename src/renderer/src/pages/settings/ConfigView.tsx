import React from 'react';

export const ConfigView: React.FC = () => {
  return (
    <section className="card p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">Configurações</h2>
        <p className="text-slate-500 dark:text-slate-300 text-sm">Ajuste preferências gerais do aplicativo.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Tema</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Use o botão no topo para alternar claro/escuro.</p>
        </div>
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Notificações</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Configure alertas de automação e lembretes (em breve).</p>
        </div>
      </div>
      <div className="text-xs text-slate-400 dark:text-slate-500">Mais opções chegarão aqui.</div>
    </section>
  );
};
