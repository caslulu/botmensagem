import React from 'react';

type ReleaseNote = {
  title: string;
  date: string;
  summary: string;
  highlights: string[];
  badge: string;
};

type VisualItem = {
  title: string;
  caption: string;
  palette: string;
  accent: string;
};

const releaseNotes: ReleaseNote[] = [
  {
    title: 'Mapa atual dos módulos',
    date: 'Abr 2026',
    summary: 'A versão atual concentra novamente toda a operação no desktop.',
    highlights: [
      'Fluxos visíveis no desktop: mensagens, cotações, kanban, RTA, preço, roadmap, novidades, perfil e configurações',
      'Seleção de perfil logo na entrada, com acesso admin apenas onde realmente é necessário',
      'Conteúdo desta tela alinhado ao comportamento atual do sistema',
    ],
    badge: 'Atual',
  },
  {
    title: 'Kanban próprio no desktop',
    date: 'Abr 2026',
    summary: 'A fila de cotações usa um quadro próprio persistido localmente no aplicativo.',
    highlights: [
      'O quadro começa com colunas de fila, em cotação e pronto',
      'O mesmo painel permite criar cards no formato atual e adicionar novas colunas',
      'A automação de cotação via Playwright permanece integrada ao mesmo fluxo',
    ],
    badge: 'Operacao',
  },
  {
    title: 'Saídas locais integradas',
    date: 'Abr 2026',
    summary: 'RTA e preço são gerados localmente e ficam disponíveis direto no ambiente desktop.',
    highlights: [
      'RTA gera PDF usando templates por seguradora',
      'Preço gera PNG com suporte a PT, EN e ES',
      'Cada perfil reutiliza sua própria sessão do WhatsApp Web',
    ],
    badge: 'Infra',
  },
];

const visuals: VisualItem[] = [
  {
    title: 'WhatsApp por perfil',
    caption: 'Envios em lote com sessão reutilizada, limite configurável e logs na tela.',
    palette: 'from-brand-500/15 via-sky-500/10 to-indigo-500/10',
    accent: 'fill-brand-500/70 stroke-brand-500/70',
  },
  {
    title: 'Fila de cotações',
    caption: 'Kanban próprio com colunas configuráveis e cards no formato operacional atual.',
    palette: 'from-emerald-500/15 via-lime-500/10 to-teal-500/10',
    accent: 'fill-emerald-500/70 stroke-emerald-500/70',
  },
  {
    title: 'RTA e preço',
    caption: 'PDFs e imagens gerados localmente com integração ao fluxo de cotações.',
    palette: 'from-amber-500/20 via-orange-500/10 to-red-500/10',
    accent: 'fill-amber-500/70 stroke-amber-500/70',
  },
];

const quickStarts = [
  {
    title: 'Acesso por perfil',
    detail: 'Selecione ou crie um perfil na entrada. Apenas administradores conseguem iniciar disparos de WhatsApp.',
  },
  {
    title: 'Fluxo de cotação',
    detail: 'Use o módulo Kanban para criar cards, mover a fila e iniciar a automação.',
  },
  {
    title: 'Arquivos gerados',
    detail: 'Use os módulos RTA e Preço no desktop; os arquivos ficam disponíveis localmente.',
  },
];

const ActionCard: React.FC<{ title: string; detail: string }> = ({ title, detail }) => (
  <div className="border border-slate-200/70 dark:border-slate-800/80 rounded-2xl p-5 bg-white/60 dark:bg-slate-900/60 shadow-sm">
    <div className="text-sm font-semibold text-brand-600 dark:text-brand-300 mb-1">{title}</div>
    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{detail}</p>
  </div>
);

const VisualMock: React.FC<VisualItem> = ({ title, caption, palette, accent }) => (
  <figure className="rounded-2xl border border-white/40 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm overflow-hidden">
    <div className={`relative h-40 w-full bg-gradient-to-br ${palette}`}>
      <svg viewBox="0 0 320 160" className="absolute inset-0 w-full h-full opacity-80">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="20" y="24" width="280" height="24" rx="6" className="fill-white/60 dark:fill-slate-800/70" />
        <rect x="20" y="64" width="200" height="20" rx="6" className="fill-white/60 dark:fill-slate-800/70" />
        <rect x="20" y="92" width="240" height="20" rx="6" className="fill-white/50 dark:fill-slate-800/60" />
        <rect x="20" y="120" width="140" height="18" rx="6" className="fill-white/40 dark:fill-slate-800/50" />
        <circle cx="272" cy="36" r="10" className={`opacity-90 ${accent}`} />
        <path d="M290 110 C280 70 240 60 200 105" className={`stroke-white/70 dark:stroke-slate-700 ${accent}`} strokeWidth="6" fill="none" strokeLinecap="round" />
      </svg>
    </div>
    <figcaption className="p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</span>
        <span className="text-xs text-slate-400">Visual</span>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{caption}</p>
    </figcaption>
  </figure>
);

export const NewsView: React.FC = () => {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/40 dark:border-slate-800 bg-gradient-to-br from-brand-500/10 via-white to-slate-50 dark:from-brand-500/10 dark:via-slate-900 dark:to-slate-950 shadow-xl p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.08em] text-brand-600 dark:text-brand-400 font-semibold">Painel da versão atual</p>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white leading-tight">Resumo rápido do que o sistema faz hoje</h2>
            <p className="text-base text-slate-600 dark:text-slate-300 max-w-2xl">
              Esta tela resume a implementação atual do app para facilitar onboarding, operação diária e alinhamento com o time.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
              <span className="px-3 py-1 rounded-full bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Baseado no código atual</span>
              <span className="px-3 py-1 rounded-full bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Pronto para onboarding interno</span>
            </div>
          </div>
          <div className="grid min-w-[240px] grid-cols-1 gap-3 sm:grid-cols-2">
            {quickStarts.map((item) => (
              <div key={item.title} className="border border-white/50 dark:border-slate-800 rounded-xl bg-white/70 dark:bg-slate-900/70 p-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.title}</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">O que existe hoje</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">Notas de referência</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {releaseNotes.map((note) => (
            <article key={note.title} className="rounded-2xl border border-slate-200/70 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200 border border-brand-200/60 dark:border-brand-500/30">{note.badge}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{note.date}</span>
              </div>
              <h4 className="text-base font-semibold text-slate-900 dark:text-white leading-snug">{note.title}</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{note.summary}</p>
              <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2 list-disc pl-4">
                {note.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Visão rápida dos módulos</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">Resumo visual do sistema</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {visuals.map((visual) => (
            <VisualMock key={visual.title} {...visual} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Como usar no dia a dia</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">Passos curtos para a operação</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {quickStarts.map((item) => (
            <ActionCard key={item.title} title={item.title} detail={item.detail} />
          ))}
        </div>
      </section>
    </div>
  );
};
