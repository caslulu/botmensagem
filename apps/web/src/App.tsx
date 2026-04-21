import { useEffect, useState } from 'react';
import { CarFront, Columns3, FileText, Image, LogOut, RefreshCcw } from 'lucide-react';
import { api, AUTH_EXPIRED_EVENT, clearStoredSession, getStoredSession, storeSession } from './api/client';
import { LoginForm } from './features/auth/LoginForm';
import { KanbanBoard } from './features/kanban/KanbanBoard';
import { PriceForm } from './features/price/PriceForm';
import { RtaForm } from './features/rta/RtaForm';
import type { AuthSession, AuthUser } from './types';

type View = 'kanban' | 'rta' | 'price';

const NAV = [
  { id: 'kanban' as const, label: 'Cotações', icon: Columns3 },
  { id: 'rta' as const, label: 'RTA', icon: FileText },
  { id: 'price' as const, label: 'Preço', icon: Image }
];

export function App() {
  const [view, setView] = useState<View>('kanban');
  const [boardRefreshKey, setBoardRefreshKey] = useState(0);
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getStoredSession()?.user || null);
  const [checkingSession, setCheckingSession] = useState(Boolean(getStoredSession()));
  const [sessionNotice, setSessionNotice] = useState('');
  const active = NAV.find((item) => item.id === view) || NAV[0];

  useEffect(() => {
    const stored = getStoredSession();
    if (!stored) {
      setCheckingSession(false);
      return;
    }

    let activeRequest = true;
    api.get<{ user: AuthUser }>('/auth/me')
      .then((response) => {
        if (!activeRequest) return;
        const nextSession: AuthSession = { ...stored, user: response.user };
        storeSession(nextSession);
        setAuthUser(response.user);
      })
      .catch(() => {
        if (!activeRequest) return;
        clearStoredSession();
        setAuthUser(null);
      })
      .finally(() => {
        if (activeRequest) setCheckingSession(false);
      });

    return () => {
      activeRequest = false;
    };
  }, []);

  useEffect(() => {
    const expireSession = () => {
      setAuthUser(null);
      setSessionNotice('Sua sessao expirou. Entre novamente.');
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, expireSession);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, expireSession);
  }, []);

  const handleAuthenticated = (session: AuthSession) => {
    setSessionNotice('');
    setAuthUser(session.user);
  };

  const logout = () => {
    void api.post('/auth/logout').catch(() => undefined);
    clearStoredSession();
    setAuthUser(null);
    setView('kanban');
    setSessionNotice('');
  };

  if (checkingSession) {
    return (
      <main className="login-screen">
        <div className="loading-strip">Validando sessao...</div>
      </main>
    );
  }

  if (!authUser) {
    return (
      <>
        {sessionNotice ? <div className="session-notice">{sessionNotice}</div> : null}
        <LoginForm onAuthenticated={handleAuthenticated} />
      </>
    );
  }

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
            <span className="status-chip">{authUser.name}</span>
            {view === 'kanban' ? (
              <button className="icon-command" type="button" onClick={() => setBoardRefreshKey((value) => value + 1)} title="Atualizar quadro">
                <RefreshCcw size={18} />
              </button>
            ) : null}
            <button className="icon-command" type="button" onClick={logout} title="Sair">
              <LogOut size={18} />
            </button>
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
