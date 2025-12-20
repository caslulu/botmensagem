import React, { useState } from 'react';
import logo from '../../assets/logo.png';

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
      className={`bg-white/90 dark:bg-slate-900/90 border-r border-slate-200/60 dark:border-slate-800/60 flex flex-col p-4 gap-4 fixed top-0 bottom-0 left-0 h-screen z-30 transition-all duration-300 backdrop-blur-md shadow-glass ${
        state === 'hidden' ? '-translate-x-full' : 'translate-x-0'
      } ${state === 'collapsed' ? 'w-20' : 'w-72'}`}
    >
      <div className={`flex items-center mb-6 transition-all duration-300 ${state === 'collapsed' ? 'justify-center' : 'justify-between px-2'}`}>
        <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${state === 'collapsed' ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 flex'}`}>
          <img src={logo} alt="Logo" className="w-10 h-10 rounded-xl object-cover shadow-sm shrink-0" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight whitespace-nowrap">
            Modules
          </h2>
        </div>
        <button
          id="sidebarToggle"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800 dark:hover:text-brand-400 transition-all active:scale-95"
          title={state === 'collapsed' ? "Expandir sidebar" : "Minimizar sidebar"}
          onClick={onToggle}
        >
          {state === 'collapsed' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          )}
        </button>
      </div>
      <nav id="servicesNav" className="flex flex-col gap-2 overflow-y-auto custom-scrollbar px-1">
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
