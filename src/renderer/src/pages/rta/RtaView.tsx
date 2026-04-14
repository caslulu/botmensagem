import React from 'react';
import { RtaForm } from './components/RtaForm';

export const RtaView: React.FC = () => (
  <div className="space-y-6">
    <section className="page-hero">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-300">
            Fluxo guiado
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
            Gere o RTA com menos retrabalho
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400 sm:text-base">
            Preencha os dados em blocos organizados, revise o veículo e gere o PDF final em Downloads.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="mini-stat">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">1. Escolha a seguradora</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Defina o template antes de seguir.</p>
          </div>
          <div className="mini-stat">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">2. Complete os blocos</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Veículo, título e proprietário ficam separados.</p>
          </div>
          <div className="mini-stat">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">3. Gere o PDF</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">O arquivo final é salvo localmente.</p>
          </div>
        </div>
      </div>
    </section>

    <RtaForm />
  </div>
);
