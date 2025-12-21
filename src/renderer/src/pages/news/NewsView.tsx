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
    title: 'Central de novidades',
    date: 'Dez 2025',
    summary: 'Leia o que mudou, veja imagens e compartilhe orientações com o time.',
    highlights: [
      'Sessão dedicada para comunicar lançamentos e ajustes finos do app',
      'Explicações curtas com exemplos visuais para cada melhoria',
      'Espaço para links úteis e próximos passos',
    ],
    badge: 'Novo',
  },
  {
    title: 'Roadmap visível ao cliente',
    date: 'Dez 2025',
    summary: 'Kanban integrado mostrando entregues, em andamento e planejado.',
    highlights: [
      'Transparência sobre o que já foi entregue e o que vem a seguir',
      'Quadro em colunas com status e responsáveis',
      'Espaço para datas estimadas e riscos',
    ],
    badge: 'Melhoria',
  },
  {
    title: 'Guias de uso contextual',
    date: 'Nov 2025',
    summary: 'Passo a passo para mensagens, Trello, cotações e geração de preços.',
    highlights: [
      'Checklists curtos para iniciar rápido cada módulo',
      'Dicas sobre permissões de administrador e troca de perfis',
      'Imagens compactas de referência visual',
    ],
    badge: 'Atualização',
  },
];

const visuals: VisualItem[] = [
  {
    title: 'Mensagens automáticas',
    caption: 'Envios em lote com logs e pausa rápida.',
    palette: 'from-brand-500/15 via-sky-500/10 to-indigo-500/10',
    accent: 'fill-brand-500/70 stroke-brand-500/70',
  },
  {
    title: 'Integração Trello',
    caption: 'Cards com anexos e rastreio dentro da aplicação.',
    palette: 'from-emerald-500/15 via-lime-500/10 to-teal-500/10',
    accent: 'fill-emerald-500/70 stroke-emerald-500/70',
  },
  {
    title: 'Preço automático',
    caption: 'Templates de preço com impostos e upload automático.',
    palette: 'from-amber-500/20 via-orange-500/10 to-red-500/10',
    accent: 'fill-amber-500/70 stroke-amber-500/70',
  },
];

const quickStarts = [
  {
    title: 'Como acessar',
    detail: 'Abra a barra lateral e clique em “Novidades”. Não exige permissão de admin.',
  },
  {
    title: 'Compartilhar com a equipe',
    detail: 'Projete a tela ou copie os pontos-chave para orientar novos usuários.',
  },
  {
    title: 'Ver roadmap',
    detail: 'Use a aba “Roadmap” para acompanhar entregas, andamento e planos.',
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
            <p className="text-sm uppercase tracking-[0.08em] text-brand-600 dark:text-brand-400 font-semibold">Novidades e guias</p>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white leading-tight">Fique por dentro do que mudou e como aproveitar</h2>
            <p className="text-base text-slate-600 dark:text-slate-300 max-w-2xl">
              Aqui você encontra um resumo rápido das últimas entregas, instruções curtas de uso e imagens para apresentar ao time ou ao cliente.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
              <span className="px-3 py-1 rounded-full bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Atualizado semanalmente</span>
              <span className="px-3 py-1 rounded-full bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Conteúdo pronto para onboarding</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[240px]">
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
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">O que chegou recentemente</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">Notas resumidas</span>
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
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Imagens rápidas</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">Para apresentações ou onboarding</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {visuals.map((visual) => (
            <VisualMock key={visual.title} {...visual} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Como usar as novidades</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">Passos curtos para o time</span>
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
