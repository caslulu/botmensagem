import React from 'react';

export interface ServiceModule {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  requiresAdmin?: boolean;
  requiresProfile?: boolean;
}

interface ServiceNavProps {
  modules: ServiceModule[];
  activeId: string | null;
  onSelect: (id: string) => void;
  selectedProfileIsAdmin: boolean;
}

export const ServiceNav: React.FC<ServiceNavProps> = ({ modules, activeId, onSelect, selectedProfileIsAdmin }) => {
  return (
    <nav className="flex flex-col gap-2">
      {modules.map((mod) => {
        const disabled = mod.requiresAdmin && !selectedProfileIsAdmin;
        return (
          <button
            key={mod.id}
            className={`service-btn group flex items-center gap-3 px-3 py-3 rounded-xl border transition-all duration-200 text-left ${
              activeId === mod.id 
                ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-500/30' 
                : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
            } ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
            onClick={() => !disabled && onSelect(mod.id)}
            disabled={disabled}
            data-service-id={mod.id}
          >
            <span className={`service-btn-icon w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-colors ${
              activeId === mod.id 
                ? 'bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300' 
                : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-brand-500 group-hover:shadow-sm dark:bg-slate-800 dark:text-slate-500 dark:group-hover:bg-slate-700 dark:group-hover:text-brand-400'
            }`}>
              {mod.icon || '❔'}
            </span>
            <span className="font-medium truncate">{mod.name}</span>
          </button>
        );
      })}
    </nav>
  );
};
