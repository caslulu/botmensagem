import React, { useState } from 'react';

export const WebAppView: React.FC = () => {
  const [error, setError] = useState<string | null>(null);

  const openWebApp = async () => {
    setError(null);
    try {
      const response = await window.webApp?.open();
      if (response && typeof response === 'object' && 'success' in response && !response.success) {
        setError(response.error || 'Não foi possível abrir a aplicação web.');
      }
    } catch (openError) {
      const message = openError instanceof Error ? openError.message : 'Não foi possível abrir a aplicação web.';
      setError(message);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <section className="page-hero">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-300">
            Aplicação web
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
            RTA, Kanban de cotações e preço agora ficam no navegador
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400 sm:text-base">
            Suba a stack Docker e abra o painel web para operar os módulos migrados.
          </p>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Painel web local</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              URL padrão: http://localhost:8080. Você pode trocar com a variável WEB_APP_URL.
            </p>
          </div>
          <button type="button" className="btn-primary px-4" onClick={openWebApp}>
            Abrir App Web
          </button>
        </div>
        {error ? <p className="mt-4 text-sm font-semibold text-rose-400">{error}</p> : null}
      </section>
    </div>
  );
};
