import React, { useEffect, useState } from 'react';
import logo from '../../assets/logo.png';
import type { Profile } from '../profile/ProfileCard';

export type SidebarState = 'expanded' | 'collapsed' | 'hidden';

interface SidebarProps {
  state: SidebarState;
  isMobile: boolean;
  onToggle: () => void;
  onClose: () => void;
  selectedProfile: Profile | null;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onResetProfile: () => void;
  children?: React.ReactNode;
}

const MOBILE_BREAKPOINT = 1100;

function getProfileInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return 'IH';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function getIsMobileViewport() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

export const Sidebar: React.FC<SidebarProps> = ({
  state,
  isMobile,
  onToggle,
  onClose,
  selectedProfile,
  isDarkMode,
  onToggleTheme,
  onResetProfile,
  children
}) => {
  const isCollapsed = !isMobile && state === 'collapsed';
  const isHidden = state === 'hidden';

  return (
    <aside
      id="sidebar"
      className={`fixed inset-y-0 left-0 z-40 flex h-screen flex-col overflow-hidden border-r border-white/60 bg-white/88 p-4 shadow-glass backdrop-blur-2xl transition-all duration-300 ${
        isDarkMode ? 'border-slate-900/90 bg-[#060d18]/96' : 'dark:border-white/5 dark:bg-slate-950/90'
      } ${
        isHidden ? '-translate-x-[108%]' : 'translate-x-0'
      } ${isMobile ? 'w-[min(23rem,calc(100vw-0.75rem))]' : isCollapsed ? 'w-28' : 'w-[21rem]'}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(45,132,120,0.18), transparent 34%), radial-gradient(circle at bottom right, rgba(245,158,11,0.14), transparent 24%)'
        }}
      />

      <div className="relative z-10 flex h-full flex-col">
        <div className={`mb-5 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between gap-3 px-1'}`}>
          <div className={`min-w-0 items-center gap-3 transition-all duration-300 ${isCollapsed ? 'hidden' : 'flex'}`}>
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-[22px] bg-brand-500/20 blur-md" />
              <img src={logo} alt="Insurance Helper" className="relative z-10 h-12 w-12 rounded-[22px] object-cover shadow-sm" />
            </div>
            <div className="min-w-0">
              <p className={`text-[0.68rem] font-semibold uppercase tracking-[0.28em] ${isDarkMode ? 'text-brand-200' : 'text-brand-700 dark:text-brand-300'}`}>
                Insurance Helper
              </p>
              <h2 className={`truncate text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                Navegação principal
              </h2>
            </div>
          </div>

          {isCollapsed ? (
            <div className={`relative flex h-12 w-12 items-center justify-center rounded-[22px] border ${
              isDarkMode ? 'border-slate-800 bg-slate-900/95' : 'border-slate-200/80 bg-white/85 dark:border-slate-800 dark:bg-slate-900/88'
            }`}>
              <img src={logo} alt="Insurance Helper" className="h-9 w-9 rounded-2xl object-cover" />
            </div>
          ) : null}

          <button
            id="sidebarToggle"
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all active:scale-95 ${
              isDarkMode
                ? 'border-slate-800 bg-slate-900/95 text-slate-200 hover:border-brand-400/35 hover:bg-slate-800 hover:text-white'
                : 'border-slate-200/80 bg-white/88 text-slate-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:border-brand-500/30 dark:hover:bg-slate-800 dark:hover:text-brand-200'
            }`}
            title={isMobile ? 'Fechar menu' : isCollapsed ? 'Expandir navegação' : 'Recolher navegação'}
            onClick={isMobile ? onClose : onToggle}
          >
            {isMobile ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            ) : isCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            )}
          </button>
        </div>

        {selectedProfile ? (
          <div
            className={`mb-4 rounded-[28px] border shadow-sm backdrop-blur-sm ${
              isDarkMode
                ? 'border-slate-800 bg-slate-900/90'
                : 'border-white/80 bg-white/72 dark:border-white/5 dark:bg-slate-900/76'
            } ${
              isCollapsed ? 'px-3 py-4' : 'p-4'
            }`}
          >
            <div className={`flex ${isCollapsed ? 'justify-center' : 'items-center gap-3'}`}>
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border text-sm font-semibold shadow-sm ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-800 text-slate-100'
                  : 'border-white/70 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
              }`}>
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
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`status-pill border-0 px-2.5 py-1 text-[0.62rem] ${
                      isDarkMode ? 'bg-brand-400/15 text-brand-100' : 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200'
                    }`}>
                      {selectedProfile.isAdmin ? 'Administrador' : 'Operador'}
                    </span>
                  </div>
                  <h3 className={`truncate text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                    {selectedProfile.name}
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    Sessão ativa para este operador
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className={`mb-3 ${isCollapsed ? 'px-1 text-center' : 'px-2'} text-[0.68rem] font-semibold uppercase tracking-[0.28em] ${
          isDarkMode ? 'text-slate-400' : 'text-slate-400 dark:text-slate-500'
        }`}>
          {isCollapsed ? 'Apps' : 'Módulos'}
        </div>

        <nav id="servicesNav" className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-1">
          {children}
        </nav>

        <div className={`mt-4 border-t pt-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-200/80 dark:border-slate-800/80'} ${isCollapsed ? 'space-y-2' : 'space-y-3'}`}>
          <button
            type="button"
            className={`flex w-full items-center rounded-[24px] border transition-all ${
              isDarkMode
                ? 'border-slate-800 bg-slate-900/95 text-slate-100 hover:border-brand-400/35 hover:bg-slate-800 hover:text-white'
                : 'border-slate-200/80 bg-white/88 text-slate-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-800 dark:bg-slate-900/88 dark:text-slate-100 dark:hover:border-brand-500/20 dark:hover:bg-slate-800 dark:hover:text-brand-200'
            } ${
              isCollapsed ? 'justify-center px-0 py-3' : 'justify-between px-4 py-3'
            }`}
            onClick={onToggleTheme}
            title={isDarkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          >
            <span className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl text-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100 dark:bg-slate-800'}`}>
                {isDarkMode ? '☀️' : '🌙'}
              </span>
              {!isCollapsed ? (
                <span className="text-left">
                  <strong className="block text-sm font-semibold">Aparência</strong>
                  <span className={`block text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    {isDarkMode ? 'Modo claro' : 'Modo escuro'}
                  </span>
                </span>
              ) : null}
            </span>
            {!isCollapsed ? (
              <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>
                Tema
              </span>
            ) : null}
          </button>

          <button
            type="button"
            className={`flex w-full items-center rounded-[24px] border transition-all ${
              isDarkMode
                ? 'border-slate-800 bg-slate-900/95 text-slate-100 hover:border-brand-400/35 hover:bg-slate-800 hover:text-white'
                : 'border-slate-200/80 bg-slate-50/88 text-slate-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-800 dark:bg-slate-900/88 dark:text-slate-100 dark:hover:border-brand-500/20 dark:hover:bg-slate-800 dark:hover:text-brand-200'
            } ${
              isCollapsed ? 'justify-center px-0 py-3' : 'justify-between px-4 py-3'
            }`}
            onClick={onResetProfile}
            title="Sair"
          >
            <span className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl text-lg shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white dark:bg-slate-800'}`}>
                ↶
              </span>
              {!isCollapsed ? (
                <span className="text-left">
                  <strong className="block text-sm font-semibold">Sair</strong>
                </span>
              ) : null}
            </span>
            {!isCollapsed ? (
              <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>
                Sessão
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </aside>
  );
};

export const useSidebarState = () => {
  const [isMobile, setIsMobile] = useState<boolean>(getIsMobileViewport);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = getIsMobileViewport();
      setIsMobile(nextIsMobile);

      if (!nextIsMobile) {
        setMobileOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const state: SidebarState = isMobile
    ? (mobileOpen ? 'expanded' : 'hidden')
    : (desktopCollapsed ? 'collapsed' : 'expanded');

  const toggle = () => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
      return;
    }
    setDesktopCollapsed((prev) => !prev);
  };

  const open = () => {
    if (isMobile) {
      setMobileOpen(true);
      return;
    }
    setDesktopCollapsed(false);
  };

  const close = () => {
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  return { state, isMobile, toggle, open, close };
};
