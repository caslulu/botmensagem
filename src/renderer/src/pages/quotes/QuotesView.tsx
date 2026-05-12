import React from 'react';
import { QuotesList } from './components/QuotesList';

export const QuotesView: React.FC = () => (
  <div className="space-y-6 pb-6">
    <section className="page-hero">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-300">
            Fila local
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
            Gerencie as cotações no Kanban nativo do desktop
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400 sm:text-base">
            Use este painel para manter as cotações locais organizadas e executar automações com fluxo totalmente nativo.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="mini-stat">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Fila local</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Tudo fica salvo no banco da aplicação.</p>
          </div>
          <div className="mini-stat">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Criação rápida</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Abra o formulário em uma janela central.</p>
          </div>
          <div className="mini-stat">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Automação segura</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Executa com os dados já preparados localmente.</p>
          </div>
        </div>
      </div>
    </section>

    <QuotesList />
  </div>
);
