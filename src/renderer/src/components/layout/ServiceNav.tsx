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
  compact?: boolean;
}

export const ServiceNav: React.FC<ServiceNavProps> = ({
  modules,
  activeId,
  onSelect,
  selectedProfileIsAdmin,
  compact = false
}) => {
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

  const renderModuleButton = (mod: ServiceModule) => {
    const disabled = mod.requiresAdmin && !selectedProfileIsAdmin;

    if (compact) {
      return (
        <button
          key={mod.id}
          className={`service-btn group flex h-12 w-full items-center justify-center rounded-2xl border transition-all duration-200 ${
            activeId === mod.id
              ? 'border-brand-200 bg-brand-50 text-brand-700 shadow-sm dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300'
              : 'border-transparent bg-white/65 text-slate-500 hover:border-slate-200 hover:bg-white hover:text-brand-600 dark:bg-slate-900/70 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-brand-300'
          } ${disabled ? 'cursor-not-allowed opacity-50 grayscale' : ''}`}
          onClick={() => !disabled && onSelect(mod.id)}
          disabled={disabled}
          data-service-id={mod.id}
          title={mod.name}
        >
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg transition-all duration-200 ${
              activeId === mod.id
                ? 'bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300'
                : 'bg-slate-100 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700 dark:group-hover:text-brand-300'
            }`}
          >
            {mod.icon || '❔'}
          </span>
        </button>
      );
    }

    return (
      <button
        key={mod.id}
        className={`service-btn group flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 ${
          activeId === mod.id
            ? 'border-brand-200 bg-brand-50 text-brand-700 shadow-sm dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300'
            : 'border-transparent text-slate-600 hover:bg-white/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200'
        } ${disabled ? 'cursor-not-allowed opacity-50 grayscale' : ''}`}
        onClick={() => !disabled && onSelect(mod.id)}
        disabled={disabled}
        data-service-id={mod.id}
      >
        <span
          className={`service-btn-icon flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-all duration-200 ${
            activeId === mod.id
              ? 'bg-brand-100 text-brand-600 shadow-sm dark:bg-brand-500/20 dark:text-brand-300'
              : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-brand-600 group-hover:shadow-sm dark:bg-slate-800 dark:text-slate-500 dark:group-hover:bg-slate-700 dark:group-hover:text-brand-400'
          }`}
        >
          {mod.icon || '❔'}
        </span>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <span className="truncate text-sm font-medium">{mod.name}</span>
          {mod.description && (
            <span className="hidden truncate text-xs text-slate-400 transition-all group-hover:block dark:text-slate-500">
              {mod.description}
            </span>
          )}
        </div>
      </button>
    );
  };

  if (compact) {
    return (
      <nav className="flex flex-col gap-4">
        {groupedModules.map((group) => (
          <div key={group.id} className="space-y-2">
            <div
              className="flex h-7 items-center justify-center text-sm text-slate-400 dark:text-slate-500"
              title={group.title}
            >
              <span>{group.icon}</span>
            </div>
            <div className="flex flex-col gap-2">
              {group.items.map((mod) => renderModuleButton(mod))}
            </div>
          </div>
        ))}
      </nav>
    );
  }

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
            {group.items.map((mod) => renderModuleButton(mod))}
          </div>
        </div>
      ))}
    </nav>
  );
};
