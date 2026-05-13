import React, { useMemo, useState } from 'react';

export interface ServiceModule {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  requiresAdmin?: boolean;
  requiresProfile?: boolean;
  group?: 'modules' | 'account';
}

interface ServiceNavProps {
  modules: ServiceModule[];
  activeId: string | null;
  onSelect: (id: string) => void;
  selectedProfileIsAdmin: boolean;
  isDarkMode: boolean;
  compact?: boolean;
}

export const ServiceNav: React.FC<ServiceNavProps> = ({
  modules,
  activeId,
  onSelect,
  selectedProfileIsAdmin,
  isDarkMode,
  compact = false
}) => {
  const groups = [
    { id: 'modules', title: 'Operação', icon: '🧭' },
    { id: 'account', title: 'Conta', icon: '⚙️' }
  ] as const;

  const initialOpen: Record<string, boolean> = { modules: true, account: true };
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
    const isActive = activeId === mod.id;

    if (compact) {
      return (
        <button
          key={mod.id}
          className={`service-btn group relative flex h-14 w-full items-center justify-center rounded-[22px] border transition-all duration-200 ${
            isDarkMode
              ? isActive
                ? 'border-brand-400/50 bg-brand-500/18 text-brand-50 shadow-[0_16px_30px_rgba(13,33,32,0.32)]'
                : 'border-slate-800 bg-slate-900/95 text-slate-200 hover:-translate-y-0.5 hover:border-brand-400/40 hover:bg-slate-800/95 hover:text-white'
              : isActive
                ? 'border-brand-200 bg-brand-50 text-brand-700 shadow-sm'
                : 'border-slate-200/70 bg-white/78 text-slate-500 hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700'
          } ${disabled ? 'cursor-not-allowed opacity-50 grayscale' : ''}`}
          onClick={() => !disabled && onSelect(mod.id)}
          disabled={disabled}
          data-service-id={mod.id}
          title={mod.name}
        >
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-2xl text-lg transition-all duration-200 ${
              isDarkMode
                ? isActive
                  ? 'bg-brand-400/20 text-brand-50'
                  : 'bg-slate-800 text-slate-200 group-hover:bg-brand-500/18 group-hover:text-white'
                : isActive
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-slate-100 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-700'
            }`}
          >
            {mod.icon || '❔'}
          </span>
          {mod.requiresAdmin ? (
            <span className={`absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
              isDarkMode ? 'bg-amber-400/15 text-amber-200' : 'bg-amber-100 text-amber-700'
            }`}>
              A
            </span>
          ) : null}
        </button>
      );
    }

    return (
      <button
        key={mod.id}
        className={`service-btn group flex w-full items-center gap-3 rounded-[24px] border px-3.5 py-3 text-left transition-all duration-200 ${
          isDarkMode
            ? isActive
              ? 'border-brand-400/45 bg-brand-500/18 text-white shadow-[0_18px_30px_rgba(7,16,22,0.36)]'
              : 'border-slate-800 bg-slate-900/95 text-slate-100 hover:-translate-y-0.5 hover:border-brand-400/35 hover:bg-slate-800/95 hover:text-white'
            : isActive
              ? 'border-brand-200 bg-brand-50/90 text-brand-800 shadow-sm'
              : 'border-slate-200/70 bg-white/75 text-slate-600 hover:-translate-y-0.5 hover:border-brand-200 hover:bg-white/95 hover:text-slate-900'
        } ${disabled ? 'cursor-not-allowed opacity-50 grayscale' : ''}`}
        onClick={() => !disabled && onSelect(mod.id)}
        disabled={disabled}
        data-service-id={mod.id}
      >
        <span
          className={`service-btn-icon flex h-11 w-11 items-center justify-center rounded-2xl text-lg transition-all duration-200 ${
            isDarkMode
              ? isActive
                ? 'bg-brand-400/20 text-brand-50 shadow-sm'
                : 'bg-slate-800 text-slate-100 group-hover:bg-brand-500/18 group-hover:text-white group-hover:shadow-sm'
              : isActive
                ? 'bg-brand-100 text-brand-700 shadow-sm'
                : 'bg-slate-100 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-700 group-hover:shadow-sm'
          }`}
        >
          {mod.icon || '❔'}
        </span>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{mod.name}</span>
            {mod.requiresAdmin ? (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                isDarkMode ? 'bg-amber-400/15 text-amber-200' : 'bg-amber-100 text-amber-700'
              }`}>
                Admin
              </span>
            ) : null}
          </div>
          <span className={`truncate text-xs ${
            isDarkMode
              ? isActive
                ? 'text-brand-100/80'
                : 'text-slate-300'
              : 'text-slate-500'
          }`}>
            {disabled ? 'Disponível apenas para administradores' : mod.description || 'Abrir módulo'}
          </span>
        </div>
        <span className={`text-sm transition-transform ${
          isDarkMode
            ? isActive
              ? 'translate-x-0 text-brand-50'
              : '-translate-x-1 text-slate-400 group-hover:translate-x-0 group-hover:text-white'
            : isActive
              ? 'translate-x-0 text-brand-600'
              : '-translate-x-1 text-slate-300 group-hover:translate-x-0 group-hover:text-brand-500'
        }`}>
          →
        </span>
      </button>
    );
  };

  if (compact) {
    return (
      <nav className="flex flex-col gap-4">
        {groupedModules.map((group) => (
          <div key={group.id} className="space-y-2">
            <div
              className={`flex h-7 items-center justify-center text-sm ${
                isDarkMode ? 'text-slate-400' : 'text-slate-400'
              }`}
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
    <nav className="flex flex-col gap-4">
      {groupedModules.map((group) => (
        <div key={group.id} className="space-y-2">
          <button
            type="button"
            className={`flex w-full items-center justify-between px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] ${
              isDarkMode ? 'text-slate-400' : 'text-slate-400'
            }`}
            onClick={() => toggleGroup(group.id)}
          >
            <span className="flex items-center gap-2"><span>{group.icon}</span>{group.title}</span>
            <span className={`transition-transform ${openGroups[group.id] ? 'rotate-0' : '-rotate-90'}`}>▼</span>
          </button>

          <div className={`flex flex-col gap-2 overflow-hidden transition-all ${openGroups[group.id] ? 'max-h-[1200px] opacity-100' : 'pointer-events-none max-h-0 opacity-0'}`}>
            {group.items.map((mod) => renderModuleButton(mod))}
          </div>
        </div>
      ))}
    </nav>
  );
};
