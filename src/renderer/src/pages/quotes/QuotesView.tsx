import React from 'react';
import { QuotesList } from './components/QuotesList';

export const QuotesView: React.FC = () => (
  <section className="card p-6 mb-6">
    <h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-2">Cotações</h2>
    <p className="text-slate-500 dark:text-slate-300 mb-4">Lista e gerenciamento de cotações salvas.</p>
    <QuotesList />
  </section>
);
