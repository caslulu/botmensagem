import { useState } from 'react';
import { CarFront, Columns3, FileText, Image, RefreshCcw } from 'lucide-react';
import { KanbanBoard } from './features/kanban/KanbanBoard';
import { PriceForm } from './features/price/PriceForm';
import { RtaForm } from './features/rta/RtaForm';

type View = 'kanban' | 'rta' | 'price';

const NAV = [
  { id: 'kanban' as const, label: 'Cotações', icon: Columns3 },
  { id: 'rta' as const, label: 'RTA', icon: FileText },
  { id: 'price' as const, label: 'Preço', icon: Image }
];

export function App() {
  const [view, setView] = useState<View>('kanban');
  const [boardRefreshKey, setBoardRefreshKey] = useState(0);
  const active = NAV.find((item) => item.id === view) || NAV[0];

  return (
    <div className="app-shell">
      <aside className="side-rail">
        <div className="brand-mark">
          <CarFront size={24} />
        </div>
        <nav className="nav-stack" aria-label="Módulos web">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-button ${view === item.id ? 'is-active' : ''}`}
                onClick={() => setView(item.id)}
                type="button"
                title={item.label}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="workspace">
        <header className="top-bar">
          <div>
            <p className="eyebrow">BotMensagem Web</p>
            <h1>{active.label}</h1>
          </div>
          <div className="top-actions">
            {view === 'kanban' ? (
              <button className="icon-command" type="button" onClick={() => setBoardRefreshKey((value) => value + 1)} title="Atualizar quadro">
                <RefreshCcw size={18} />
              </button>
            ) : null}
          </div>
        </header>

        <main className="workspace-main">
          {view === 'kanban' ? <KanbanBoard refreshKey={boardRefreshKey} /> : null}
          {view === 'rta' ? <RtaForm /> : null}
          {view === 'price' ? <PriceForm /> : null}
        </main>
      </div>
    </div>
  );
}
