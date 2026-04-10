import React, { useState } from 'react';
import logo from '../../assets/logo.png';
import type { Profile } from '../profile/ProfileCard';

export type SidebarState = 'expanded' | 'collapsed' | 'hidden';

interface SidebarProps {
  state: SidebarState;
  onToggle: () => void;
  selectedProfile: Profile | null;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onResetProfile: () => void;
  children?: React.ReactNode;
}

function getProfileInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return 'IH';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export const Sidebar: React.FC<SidebarProps> = ({
  state,
  onToggle,
  selectedProfile,
  isDarkMode,
  onToggleTheme,
  onResetProfile,
  children
}) => {
  const isCollapsed = state === 'collapsed';

  return (
    <aside
      id="sidebar"
      className={`fixed top-0 bottom-0 left-0 z-30 flex h-screen flex-col overflow-hidden border-r border-slate-200/70 bg-white/88 p-4 shadow-glass backdrop-blur-xl transition-all duration-300 dark:border-slate-800/70 dark:bg-slate-950/88 ${
        state === 'hidden' ? '-translate-x-full' : 'translate-x-0'
      } ${isCollapsed ? 'w-24' : 'w-80'}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(99,102,241,0.16), transparent 34%), radial-gradient(circle at bottom right, rgba(14,165,233,0.10), transparent 30%)'
        }}
      />

      <div className="relative z-10 flex h-full flex-col">
        <div className={`mb-5 flex items-center transition-all duration-300 ${isCollapsed ? 'justify-center' : 'justify-between px-1'}`}>
          <div className={`min-w-0 items-center gap-3 overflow-hidden transition-all duration-300 ${isCollapsed ? 'hidden w-0 opacity-0' : 'flex w-auto opacity-100'}`}>
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-brand-500/20 blur-md" />
              <img src={logo} alt="Logo" className="relative z-10 h-11 w-11 rounded-2xl object-cover shadow-sm" />
            </div>
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-brand-600 dark:text-brand-300">
                Insurance Helper
              </p>
              <h2 className="truncate text-base font-semibold text-slate-800 dark:text-slate-100">
                Central de módulos
              </h2>
            </div>
          </div>

          {isCollapsed ? (
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/70 bg-white/80 dark:border-slate-800 dark:bg-slate-900/90">
              <img src={logo} alt="Logo" className="h-8 w-8 rounded-xl object-cover" />
            </div>
          ) : null}

          <button
            id="sidebarToggle"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/70 bg-white/80 text-slate-500 transition-all hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 active:scale-95 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:border-brand-500/30 dark:hover:bg-slate-800 dark:hover:text-brand-300"
            title={isCollapsed ? 'Expandir sidebar' : 'Minimizar sidebar'}
            onClick={onToggle}
          >
            {isCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            )}
          </button>
        </div>

        {selectedProfile ? (
          <div
            className={`mb-4 rounded-[1.75rem] border border-slate-200/70 bg-white/72 shadow-sm backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-900/72 ${
              isCollapsed ? 'px-3 py-4' : 'p-4'
            }`}
          >
            <div className={`flex ${isCollapsed ? 'justify-center' : 'items-center gap-3'}`}>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/60 bg-slate-100 text-sm font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {selectedProfile.thumbnail ? (
                  <img
                    src={selectedProfile.thumbnail}
                    alt={`Foto de ${selectedProfile.name}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getProfileInitials(selectedProfile.name)
                )}
              </div>

              {!isCollapsed ? (
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-semibold text-slate-800 dark:text-slate-100">
                    {selectedProfile.name}
                  </h3>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className={`mb-3 ${isCollapsed ? 'px-1 text-center' : 'px-2'} text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500`}>
          {isCollapsed ? 'Apps' : 'Navegação'}
        </div>

        <nav id="servicesNav" className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-1">
          {children}
        </nav>

        <div className={`mt-4 border-t border-slate-200/70 pt-4 dark:border-slate-800/70 ${isCollapsed ? 'space-y-2' : 'space-y-3'}`}>
          <button
            type="button"
            className={`flex w-full items-center rounded-2xl border border-slate-200/70 bg-white/80 text-slate-700 transition-all hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-amber-500/20 dark:hover:bg-slate-800 dark:hover:text-amber-200 ${
              isCollapsed ? 'justify-center px-0 py-3' : 'justify-between px-4 py-3'
            }`}
            onClick={onToggleTheme}
            title={isDarkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg dark:bg-slate-800">
                {isDarkMode ? '☀️' : '🌙'}
              </span>
              {!isCollapsed ? (
                <span className="text-left">
                  <strong className="block text-sm font-semibold">Aparência</strong>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {isDarkMode ? 'Voltar para modo claro' : 'Ativar modo escuro'}
                  </span>
                </span>
              ) : null}
            </span>
            {!isCollapsed ? (
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                {isDarkMode ? 'Claro' : 'Escuro'}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            className={`flex w-full items-center rounded-2xl border border-slate-200/70 bg-slate-50/90 text-slate-700 transition-all hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-brand-500/30 dark:hover:bg-slate-800 dark:hover:text-brand-300 ${
              isCollapsed ? 'justify-center px-0 py-3' : 'justify-between px-4 py-3'
            }`}
            onClick={onResetProfile}
            title="Trocar perfil"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg shadow-sm dark:bg-slate-800">
                ↶
              </span>
              {!isCollapsed ? (
                <span className="text-left">
                  <strong className="block text-sm font-semibold">Trocar perfil</strong>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    Voltar para a seleção inicial
                  </span>
                </span>
              ) : null}
            </span>
            {!isCollapsed ? (
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Perfil
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </aside>
  );
};

export const useSidebarState = () => {
  const [state, setState] = useState<SidebarState>('expanded');
  const toggle = () => {
    setState((prev) =>
      prev === 'expanded' ? 'collapsed' : prev === 'collapsed' ? 'expanded' : 'expanded'
    );
  };
  const show = () => setState('expanded');
  const hide = () => setState('hidden');
  return { state, toggle, show, hide };
};
