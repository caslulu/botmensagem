import React from 'react';
import { RtaForm } from './components/RtaForm';

export const RtaView: React.FC = () => (
  <section className="card p-6 mb-6">
    <h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-2">RTA Automático</h2>
    <p className="text-slate-500 dark:text-slate-300 mb-4">Formulário e geração de PDF do RTA.</p>
    <RtaForm />
  </section>
);
