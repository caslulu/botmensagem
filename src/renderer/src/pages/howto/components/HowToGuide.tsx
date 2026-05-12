import React from 'react';

const STEPS = [
  {
    title: 'Selecione um operador',
    detail: 'Escolha um perfil existente ou crie um novo para abrir a sessão correta do sistema.'
  },
  {
    title: 'Entre no módulo certo',
    detail: 'Use o menu lateral para mensagens, cotações, kanban, RTA, preço, perfil, ajuda ou configurações.'
  },
  {
    title: 'Finalize o arquivo ou ação',
    detail: 'Todo o fluxo acontece no desktop, incluindo geração de RTA, preço e gestão das cotações.'
  }
];

const MODULES = [
  {
    title: 'Mensagens',
    detail: 'Disponível para administradores. Ajuste o limite de envios, acompanhe os logs e gerencie mensagens salvas.'
  },
  {
    title: 'Kanban',
    detail: 'Organize cards em colunas locais, mova etapas e inicie automações de cotação direto do card.'
  },
  {
    title: 'RTA e Preço',
    detail: 'Gere PDFs de RTA e imagens de preço sem sair do app, com integração às cotações.'
  },
  {
    title: 'Perfil',
    detail: 'Edite nome, imagem e dados básicos do operador selecionado.'
  },
  {
    title: 'Configurações',
    detail: 'Se for admin, visualize todos os perfis e faça manutenção da base.'
  }
];

const TIPS = [
  'Somente administradores podem iniciar disparos automáticos no WhatsApp.',
  'RTA, preço, cotações e kanban agora são 100% desktop.',
  'Cada perfil reaproveita sua própria sessão do WhatsApp Web.',
  'O Kanban local integra automação de cotação e dados de preço no mesmo fluxo.'
];

export const HowToGuide: React.FC = () => (
  <div className="space-y-6">
    <section className="page-hero">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-300">
            Guia rápido
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
            Como usar o app no dia a dia
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400 sm:text-base">
            Este resumo ajuda no onboarding e também serve como referência rápida durante a operação.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="mini-stat">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">
                Etapa {index + 1}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{step.title}</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{step.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="card p-5 sm:p-6">
      <div className="mb-5">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Módulos principais</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Resumo do que cada área faz para o operador.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((module) => (
          <article key={module.title} className="surface-subtle">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{module.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{module.detail}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="card p-5 sm:p-6">
      <div className="mb-5">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Dicas rápidas</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Pontos importantes para evitar dúvidas comuns durante a operação.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {TIPS.map((tip) => (
          <div key={tip} className="surface-subtle flex items-start gap-3">
            <span className="mt-1 text-brand-600 dark:text-brand-300">•</span>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{tip}</p>
          </div>
        ))}
      </div>
    </section>
  </div>
);
