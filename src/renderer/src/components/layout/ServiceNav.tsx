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
            className={`service-btn flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 transition ${
              activeId === mod.id ? 'bg-blue-900/30 text-blue-400 border-blue-500' : 'hover:bg-slate-800'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !disabled && onSelect(mod.id)}
            disabled={disabled}
            data-service-id={mod.id}
          >
            <span className="service-btn-icon w-8 h-8 flex items-center justify-center bg-slate-700/30 rounded-md">
              {mod.icon || '❔'}
            </span>
            <span>{mod.name}</span>
          </button>
        );
      })}
    </nav>
  );
};
