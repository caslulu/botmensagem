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

  return (
    <div className="min-h-screen bg-transparent">
      <Sidebar
        state={sidebar.state}
        onToggle={sidebar.toggle}
        selectedProfile={selectedProfile}
        isDarkMode={isDarkMode}
        onToggleTheme={onToggleTheme}
        onResetProfile={onResetProfile}
      >
        <ServiceNav
          modules={modules}
          activeId={activeModuleId}
          onSelect={onSelectModule}
          selectedProfileIsAdmin={selectedProfileIsAdmin}
          compact={sidebar.state === 'collapsed'}
        />
      </Sidebar>
      <div
        id="appShell"
        className={`flex-1 min-h-screen transition-all duration-300 ${
          sidebar.state === 'expanded' ? 'pl-80' : sidebar.state === 'collapsed' ? 'pl-24' : 'pl-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export default AppShell;
