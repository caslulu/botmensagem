import React from 'react';
import { TrelloForm } from './components/TrelloForm';

export const TrelloView: React.FC = () => (
  <section className="card p-6 mb-6">
    <h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-2">Integração Trello</h2>
    <p className="text-slate-500 dark:text-slate-300 mb-4">Formulário para criar cards e anexar arquivos no Trello.</p>
    <TrelloForm />
  </section>
);
