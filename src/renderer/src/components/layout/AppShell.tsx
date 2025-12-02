import React from 'react';
import { Sidebar, useSidebarState } from './Sidebar';
import { ServiceNav } from './ServiceNav';


interface AppShellProps {
  children: React.ReactNode;
  modules: import('./ServiceNav').ServiceModule[];
  activeModuleId: string | null;
  onSelectModule: (id: string) => void;
  selectedProfileIsAdmin: boolean;
}

const AppShell: React.FC<AppShellProps> = ({ children, modules, activeModuleId, onSelectModule, selectedProfileIsAdmin }) => {
  const sidebar = useSidebarState();

  return (
    <div className="min-h-screen flex">
      <Sidebar state={sidebar.state} onToggle={sidebar.toggle}>
        <ServiceNav
          modules={modules}
          activeId={activeModuleId}
          onSelect={onSelectModule}
          selectedProfileIsAdmin={selectedProfileIsAdmin}
        />
      </Sidebar>
      <div
        id="appShell"
        className={`flex-1 min-h-screen transition-all duration-300 ${
          sidebar.state === 'expanded' ? 'pl-72' : sidebar.state === 'collapsed' ? 'pl-20' : 'pl-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export default AppShell;
