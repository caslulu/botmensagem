import { useEffect, useState } from 'react';
import { CarFront, Columns3, FileText, Image, LogOut, RefreshCcw, ShieldCheck, UserRound } from 'lucide-react';
import { api, AUTH_EXPIRED_EVENT, clearStoredSession, getStoredSession, storeSession } from './api/client';
import { AdminView } from './features/admin/AdminView';
import { LoginForm } from './features/auth/LoginForm';
import { KanbanBoard } from './features/kanban/KanbanBoard';
import { PriceForm } from './features/price/PriceForm';
import { ProfileView } from './features/profile/ProfileView';
import { RtaForm } from './features/rta/RtaForm';
import type { AuthSession, AuthUser, KanbanCard } from './types';

type View = 'kanban' | 'rta' | 'price' | 'profile' | 'admin';

const NAV = [
  { id: 'kanban' as const, label: 'Cotações', icon: Columns3 },
  { id: 'rta' as const, label: 'RTA', icon: FileText },
  { id: 'price' as const, label: 'Preço', icon: Image },
  { id: 'profile' as const, label: 'Perfil', icon: UserRound }
];

export function App() {
  const [view, setView] = useState<View>('kanban');
  const [boardRefreshKey, setBoardRefreshKey] = useState(0);
  const [priceSelection, setPriceSelection] = useState<{ cardId: string; version: number } | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getStoredSession()?.user || null);
  const [checkingSession, setCheckingSession] = useState(Boolean(getStoredSession()));
  const [sessionNotice, setSessionNotice] = useState('');
  const navItems = authUser?.role === 'admin' ? [...NAV, { id: 'admin' as const, label: 'Admin', icon: ShieldCheck }] : NAV;
  const active = navItems.find((item) => item.id === view) || navItems[0];

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
        setSessionNotice('Nao foi possivel validar sua sessao. Entre novamente.');
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

  const updateAuthenticatedUser = (user: AuthUser) => {
    const stored = getStoredSession();
    const session: AuthSession = {
      expiresAt: stored?.expiresAt || new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      user
    };
    storeSession(session);
    setAuthUser(user);
  };

  const logout = () => {
    void api.post('/auth/logout').catch(() => undefined);
    clearStoredSession();
    setAuthUser(null);
    setView('kanban');
    setSessionNotice('');
  };

  const openPriceForCard = (card: KanbanCard) => {
    setPriceSelection({ cardId: card.id, version: Date.now() });
    setView('price');
  };

  const handlePriceGenerated = (cardId: string) => {
    if (cardId) setBoardRefreshKey((value) => value + 1);
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
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-button ${view === item.id ? 'is-active' : ''}`}
                onClick={() => {
                  if (item.id === 'price') setPriceSelection(null);
                  setView(item.id);
                }}
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
            <span className="status-chip user-chip">
              {authUser.avatarUrl ? <img src={authUser.avatarUrl} alt="" /> : null}
              {authUser.name}
            </span>
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
          {view === 'kanban' ? <KanbanBoard refreshKey={boardRefreshKey} onCreatePrice={openPriceForCard} /> : null}
          {view === 'rta' ? <RtaForm /> : null}
          {view === 'price' ? (
            <PriceForm
              selectedCardId={priceSelection?.cardId || null}
              selectionVersion={priceSelection?.version || 0}
              onGenerated={handlePriceGenerated}
            />
          ) : null}
          {view === 'profile' ? <ProfileView user={authUser} onUserChange={updateAuthenticatedUser} /> : null}
          {view === 'admin' && authUser.role === 'admin' ? <AdminView /> : null}
        </main>
      </div>
    </div>
  );
}
