import React, { useState } from 'react';

export type SidebarState = 'expanded' | 'collapsed' | 'hidden';

interface SidebarProps {
  state: SidebarState;
  onToggle: () => void;
  children?: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onToggle, children }) => {
  return (
    <aside
      id="sidebar"
      className={`w-64 bg-slate-900/50 border-r border-slate-800 flex flex-col p-4 gap-4 fixed top-0 bottom-0 left-0 h-screen z-30 transition-all duration-200 ${
        state === 'hidden' ? 'hidden' : ''
      } ${state === 'collapsed' ? 'w-16' : 'w-64'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-white">Serviços</h2>
        <button
          id="sidebarToggle"
          className="text-slate-400 hover:text-white text-2xl leading-none"
          title="Minimizar sidebar"
          onClick={onToggle}
        >
          ‹
        </button>
      </div>
      <nav id="servicesNav" className="flex flex-col gap-2">
        {children}
      </nav>
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
