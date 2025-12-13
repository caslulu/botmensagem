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
      className={`bg-white/80 dark:bg-slate-900/80 border-r border-slate-200 dark:border-slate-800 flex flex-col p-4 gap-4 fixed top-0 bottom-0 left-0 h-screen z-30 transition-all duration-300 backdrop-blur-xl shadow-xl ${
        state === 'hidden' ? '-translate-x-full' : 'translate-x-0'
      } ${state === 'collapsed' ? 'w-20' : 'w-72'}`}
    >
      <div className={`flex items-center mb-2 transition-all duration-300 ${state === 'collapsed' ? 'justify-center' : 'justify-between'}`}>
        <h2 className={`text-lg font-bold bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent whitespace-nowrap overflow-hidden transition-all duration-300 ${state === 'collapsed' ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          Serviços
        </h2>
        <button
          id="sidebarToggle"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800 dark:hover:text-brand-400 transition-all"
          title={state === 'collapsed' ? "Expandir sidebar" : "Minimizar sidebar"}
          onClick={onToggle}
        >
          {state === 'collapsed' ? '›' : '‹'}
        </button>
      </div>
      <nav id="servicesNav" className="flex flex-col gap-2 overflow-y-auto custom-scrollbar">
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
