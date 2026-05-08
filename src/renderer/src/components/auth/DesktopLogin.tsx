import React, { useEffect, useRef, useState } from 'react';

type DesktopLoginProps = {
  onLogin: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  loading?: boolean;
  error?: string;
  onToggleTheme: () => void;
  isDarkMode: boolean;
};

export const DesktopLogin: React.FC<DesktopLoginProps> = ({ onLogin, loading = false, error, onToggleTheme, isDarkMode }) => {
  const emailRef = useRef<HTMLInputElement | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length < 8 || submitting) return;

    setSubmitting(true);
    setLocalError('');
    const result = await onLogin({ email: normalizedEmail, password });
    if (!result.success) {
      setLocalError(result.error || 'Nao foi possivel entrar.');
    } else {
      setPassword('');
    }
    setSubmitting(false);
  };

  const busy = loading || submitting;
  const shownError = localError || error;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-[28rem] w-[28rem] rounded-full bg-brand-500/12 blur-[120px]" />
        <div className="absolute bottom-[-14%] right-[-6%] h-[24rem] w-[24rem] rounded-full bg-amber-400/10 blur-[110px]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center px-4 py-6 sm:px-6 lg:px-10">
        <form className="card mx-auto w-full max-w-md p-6 sm:p-7" onSubmit={handleSubmit}>
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                BotMensagem
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                Entrar
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Use o mesmo email e senha cadastrados no painel web.
              </p>
            </div>
            <button type="button" className="btn-secondary px-3.5" onClick={onToggleTheme}>
              <span className="text-base">{isDarkMode ? 'Claro' : 'Escuro'}</span>
            </button>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</span>
              <input
                ref={emailRef}
                type="email"
                className="input-control"
                autoComplete="email"
                value={email}
                disabled={busy}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Senha</span>
              <input
                type="password"
                className="input-control"
                autoComplete="current-password"
                value={password}
                minLength={8}
                disabled={busy}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          </div>

          {shownError ? (
            <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              {shownError}
            </div>
          ) : null}

          <button className="btn-primary mt-6 w-full justify-center px-5" type="submit" disabled={!email.trim() || password.length < 8 || busy}>
            {busy ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};
