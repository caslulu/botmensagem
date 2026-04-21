import { FormEvent, useEffect, useRef, useState } from 'react';
import { LogIn } from 'lucide-react';
import { api, storeSession } from '../../api/client';
import type { AuthSession } from '../../types';

type Props = {
  onAuthenticated: (session: AuthSession) => void;
};

export function LoginForm({ onAuthenticated }: Props) {
  const emailRef = useRef<HTMLInputElement | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length < 8 || loading) return;

    setLoading(true);
    setError('');
    try {
      const session = await api.post<AuthSession>('/auth/login', {
        email: normalizedEmail,
        password
      });
      storeSession(session);
      onAuthenticated(session);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel entrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-screen">
      <form className="login-panel" onSubmit={submit}>
        <div className="brand-mark login-brand">
          <LogIn size={24} />
        </div>
        <div>
          <p className="eyebrow">BotMensagem Web</p>
          <h1>Login</h1>
        </div>

        <label className="field" htmlFor="login-email">
          <span>Email</span>
          <input
            ref={emailRef}
            id="login-email"
            className="control"
            type="email"
            autoComplete="email"
            value={email}
            disabled={loading}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="field" htmlFor="login-password">
          <span>Senha</span>
          <input
            id="login-password"
            className="control"
            type="password"
            autoComplete="current-password"
            value={password}
            minLength={8}
            disabled={loading}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error ? <div className="notice-error login-error">{error}</div> : null}

        <button className="primary-button login-button" type="submit" disabled={!email.trim() || password.length < 8 || loading}>
          <LogIn size={16} /> {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
