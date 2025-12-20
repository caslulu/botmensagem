import React, { useMemo, useState } from 'react';

export interface ServiceModule {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  requiresAdmin?: boolean;
  requiresProfile?: boolean;
  group?: 'modules' | 'news' | 'account';
}

interface ServiceNavProps {
  modules: ServiceModule[];
  activeId: string | null;
  onSelect: (id: string) => void;
  selectedProfileIsAdmin: boolean;
}

export const ServiceNav: React.FC<ServiceNavProps> = ({ modules, activeId, onSelect, selectedProfileIsAdmin }) => {
  const groups = [
    { id: 'modules', title: 'Módulos', icon: '🧭' },
    { id: 'news', title: 'Notícias', icon: '📰' },
    { id: 'account', title: 'Perfil & Config', icon: '⚙️' }
  ] as const;

  const initialOpen: Record<string, boolean> = { modules: true, news: true, account: true };
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen);

  const groupedModules = useMemo(() => {
    return groups.map((group) => ({
      ...group,
      items: modules.filter((m) => (m.group || 'modules') === group.id)
    })).filter((g) => g.items.length > 0);
  }, [modules]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <nav className="flex flex-col gap-3">
      {groupedModules.map((group) => (
        <div key={group.id} className="space-y-1">
          <button
            type="button"
            className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.06em]"
            onClick={() => toggleGroup(group.id)}
          >
            <span className="flex items-center gap-2"><span>{group.icon}</span>{group.title}</span>
            <span className={`transition-transform ${openGroups[group.id] ? 'rotate-0' : '-rotate-90'}`}>▼</span>
          </button>

          <div className={`flex flex-col gap-2 transition-all ${openGroups[group.id] ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'} overflow-hidden`}> 
            {group.items.map((mod) => {
              const disabled = mod.requiresAdmin && !selectedProfileIsAdmin;
              return (
                <button
                  key={mod.id}
                  className={`service-btn group flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-200 text-left ${
                    activeId === mod.id 
                      ? 'bg-brand-50 border-brand-200/50 text-brand-700 shadow-sm dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-500/20' 
                      : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
                  } ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                  onClick={() => !disabled && onSelect(mod.id)}
                  disabled={disabled}
                  data-service-id={mod.id}
                >
                  <span className={`service-btn-icon w-9 h-9 flex items-center justify-center rounded-md text-lg transition-all duration-200 ${
                    activeId === mod.id 
                      ? 'bg-brand-100 text-brand-600 shadow-sm dark:bg-brand-500/20 dark:text-brand-300' 
                      : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-brand-600 group-hover:shadow-sm dark:bg-slate-800 dark:text-slate-500 dark:group-hover:bg-slate-700 dark:group-hover:text-brand-400'
                  }`}>
                    {mod.icon || '❔'}
                  </span>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-medium truncate text-sm">{mod.name}</span>
                    {mod.description && (
                      <span className="text-xs text-slate-400 truncate hidden group-hover:block transition-all">{mod.description}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
};
