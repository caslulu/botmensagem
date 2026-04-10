import React from 'react';
import { QuotesList } from './components/QuotesList';

export const QuotesView: React.FC = () => (
  <section className="space-y-6 mb-6">
    <div className="card p-6">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-2">Cotações</h2>
        <p className="text-slate-500 dark:text-slate-300">
          Visual único da lista &quot;COTAÇÕES PARA FAZER&quot; com espelho local das cotações salvas. A criação de nova cotação agora fica no fim da própria lista, no mesmo fluxo do Trello.
        </p>
      </div>
    </div>

    <div className="card p-6">
      <QuotesList />
    </div>
  </section>
);
