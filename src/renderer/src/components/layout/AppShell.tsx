import React from 'react';
import { Sidebar, useSidebarState } from './Sidebar';
import { ServiceNav } from './ServiceNav';
import type { Profile } from '../profile/ProfileCard';

interface AppShellProps {
  children: React.ReactNode;
  modules: import('./ServiceNav').ServiceModule[];
  activeModuleId: string | null;
  onSelectModule: (id: string) => void;
  selectedProfileIsAdmin: boolean;
  selectedProfile: Profile | null;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onResetProfile: () => void;
}

function getProfileInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return 'IH';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

const GROUP_LABELS = {
  modules: 'Operação',
  news: 'Apoio',
  account: 'Conta'
} as const;

const AppShell: React.FC<AppShellProps> = ({
  children,
  modules,
  activeModuleId,
  onSelectModule,
  selectedProfileIsAdmin,
  selectedProfile,
  isDarkMode,
  onToggleTheme,
  onResetProfile
}) => {
  const sidebar = useSidebarState();
  const activeModule = modules.find((module) => module.id === activeModuleId) || modules[0] || null;
  const contentOffset = sidebar.isMobile
    ? 'pl-0'
    : sidebar.state === 'collapsed'
      ? 'lg:pl-28'
      : 'lg:pl-[21rem]';
  const hasTemporaryAdminAccess = Boolean(
    activeModule?.requiresAdmin && selectedProfileIsAdmin && !selectedProfile?.isAdmin
  );

  const handleSelectModule = (id: string) => {
    onSelectModule(id);
    if (sidebar.isMobile) {
      sidebar.close();
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      {sidebar.isMobile && sidebar.state !== 'hidden' ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-sm"
          onClick={sidebar.close}
        />
      ) : null}

      <Sidebar
        state={sidebar.state}
        isMobile={sidebar.isMobile}
        onToggle={sidebar.toggle}
        onClose={sidebar.close}
        selectedProfile={selectedProfile}
        isDarkMode={isDarkMode}
        onToggleTheme={onToggleTheme}
        onResetProfile={onResetProfile}
      >
        <ServiceNav
          modules={modules}
          activeId={activeModuleId}
          onSelect={handleSelectModule}
          selectedProfileIsAdmin={selectedProfileIsAdmin}
          isDarkMode={isDarkMode}
          compact={!sidebar.isMobile && sidebar.state === 'collapsed'}
        />
      </Sidebar>

      <div className={`transition-all duration-300 ${contentOffset}`}>
        <div className="min-h-screen">
          <div className="px-4 pt-4 sm:px-6 lg:px-8">
            <header className="mx-auto max-w-[1600px]">
              <div className="rounded-[30px] border border-white/80 bg-white/76 p-4 shadow-card backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/74 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    {sidebar.isMobile ? (
                      <button
                        type="button"
                        className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 text-slate-600 transition-all hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-brand-500/20 dark:hover:text-brand-200"
                        onClick={sidebar.open}
                        aria-label="Abrir menu"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="6" y2="6" /><line x1="3" x2="21" y1="12" y2="12" /><line x1="3" x2="21" y1="18" y2="18" /></svg>
                      </button>
                    ) : null}

                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="status-pill">
                          {GROUP_LABELS[activeModule?.group || 'modules']}
                        </span>
                        {activeModule?.requiresAdmin ? (
                          <span className="status-pill border-0 bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                            Protegido
                          </span>
                        ) : null}
                        {hasTemporaryAdminAccess ? (
                          <span className="status-pill border-0 bg-brand-100 text-brand-700 dark:bg-brand-500/12 dark:text-brand-100">
                            Acesso admin liberado
                          </span>
                        ) : null}
                      </div>
                      <h1 className="text-3xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-[2.2rem]">
                        {activeModule?.name || 'Insurance Helper'}
                      </h1>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-base">
                        {activeModule?.description || 'Gerencie a operação do sistema a partir deste painel.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                    {selectedProfile ? (
                      <div className="flex items-center gap-3 rounded-[24px] border border-slate-200/80 bg-slate-50/86 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/80">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white text-sm font-semibold text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-100">
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
                        <div className="min-w-0">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                            Operador ativo
                          </div>
                          <div className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                            {selectedProfile.name}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <button
                      type="button"
                      className="btn-secondary px-3.5"
                      onClick={onToggleTheme}
                      title={isDarkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
                    >
                      <span className="text-base">{isDarkMode ? '☀️' : '🌙'}</span>
                      <span className="hidden sm:inline">{isDarkMode ? 'Modo claro' : 'Modo escuro'}</span>
                    </button>

                    <button type="button" className="btn-primary px-4" onClick={onResetProfile}>
                      <span>Trocar perfil</span>
                    </button>
                  </div>
                </div>
              </div>
            </header>
          </div>

          <div className="px-4 pb-8 pt-4 sm:px-6 lg:px-8 lg:pb-10">
            <main className="mx-auto w-full max-w-[1600px] animate-fade-in">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppShell;
