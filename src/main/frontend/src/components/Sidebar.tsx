import React from 'react';
import { FileText, KanbanSquare, Menu, LogOut, Search } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

type Props = {
  current: 'rta' | 'trello';
  onChange: (v: 'rta' | 'trello') => void;
  collapsed?: boolean;
  onToggle?: () => void;
};

export const Sidebar: React.FC<Props> = ({ current, onChange, collapsed = false, onToggle }) => {
  const items = [
    { key: 'rta' as const, label: 'Auto RTA', icon: <FileText className="w-5 h-5" /> },
    { key: 'trello' as const, label: 'Auto Trello', icon: <KanbanSquare className="w-5 h-5" /> },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-4 border-b border-white/10 flex items-center gap-3">
        <button
          onClick={onToggle}
          className="inline-flex items-center justify-center rounded-md p-2 text-white/90 hover:text-white hover:bg-white/10 transition"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        {collapsed ? (
          <div className="ml-1 font-bold tracking-wide">IS</div>
        ) : (
          <div className="leading-tight">
            <div className="font-semibold tracking-wide">Insurance System</div>
            <div className="text-[11px] text-white/70">Módulos</div>
          </div>
        )}
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="w-4 h-4 text-white/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 rounded-md bg-white/10 text-white placeholder-white/60 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
        </div>
      )}

      {/* Items */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {items.map((it) => {
          const active = current === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              title={collapsed ? it.label : undefined}
              className={`group relative flex items-center ${collapsed ? 'justify-center' : 'justify-start'} gap-3 w-full text-left px-3 py-2.5 rounded-lg transition ${
                active
                  ? 'text-white'
                  : 'text-white/85 hover:text-white'
              }`}
            >
              {/* Active pill background */}
              {active && (
                <span className="absolute inset-0 rounded-lg bg-white/15 ring-1 ring-white/20" aria-hidden />
              )}
              <span className={`relative shrink-0 ${active ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>{it.icon}</span>
              {!collapsed && <span className="relative font-medium">{it.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 flex items-center justify-between">
        {!collapsed ? (
          <button className="inline-flex items-center gap-2 text-white/85 hover:text-white transition">
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Logout</span>
          </button>
        ) : (
          <button className="inline-flex items-center justify-center text-white/85 hover:text-white">
            <LogOut className="w-4 h-4" />
          </button>
        )}
        <ThemeToggle />
      </div>
    </div>
  );
};

export default Sidebar;
