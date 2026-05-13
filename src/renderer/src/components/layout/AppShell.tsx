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
  const contentOffset = sidebar.isMobile
    ? 'pl-0'
    : sidebar.state === 'collapsed'
      ? 'lg:pl-28'
      : 'lg:pl-[21rem]';

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
          {sidebar.isMobile && sidebar.state === 'hidden' ? (
            <button
              type="button"
              className="fixed left-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 text-slate-600 shadow-sm transition-all hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-brand-500/20 dark:hover:text-brand-200"
              onClick={sidebar.open}
              aria-label="Abrir menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="6" y2="6" /><line x1="3" x2="21" y1="12" y2="12" /><line x1="3" x2="21" y1="18" y2="18" /></svg>
            </button>
          ) : null}

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
