import React from 'react';
import { PriceForm } from './components/PriceForm';

export const PriceView: React.FC = () => (
  <div className="space-y-6">
    <section className="page-hero">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-300">
            Imagem de preço
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
            Monte a oferta e gere a arte final
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400 sm:text-base">
            Carregue uma cotação existente ou preencha manualmente os valores para produzir a imagem em poucos passos.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="mini-stat">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Carregar cotação</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Reaproveite dados salvos no app.</p>
          </div>
          <div className="mini-stat">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Ajustar idioma</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">PT, EN e ES continuam disponíveis.</p>
          </div>
          <div className="mini-stat">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Salvar e abrir</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Abra o arquivo final sem sair do fluxo.</p>
          </div>
        </div>
      </div>
    </section>

    <PriceForm />
  </div>
);
