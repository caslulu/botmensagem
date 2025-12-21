import React from 'react';
import { PriceForm } from './components/PriceForm';

export const PriceView: React.FC = () => (
  <section className="card p-6 mb-6">
    <h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-2">Preço Automático</h2>
    <p className="text-slate-500 dark:text-slate-300 mb-4">Geração de imagens de preço e envio ao Trello.</p>
    <PriceForm />
  </section>
);
