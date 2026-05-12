import React, { useState } from 'react';
import { useProfileContext } from '../../app/providers';

const SETTINGS_CARDS = [
  {
    title: 'Tema',
    detail: 'Use o botão no topo para alternar entre modo claro e escuro.'
  },
  {
    title: 'Login cloud',
    detail: 'A autenticação do desktop usa a mesma conta da web.'
  },
  {
    title: 'Banco cloud',
    detail: 'Os dados operacionais seguem sincronizados via API.'
  }
];

export const ConfigView: React.FC = () => {
  const { authUser } = useProfileContext();
  const isAdmin = authUser?.role === 'admin';
  const [newLoginName, setNewLoginName] = useState('');
  const [newLoginEmail, setNewLoginEmail] = useState('');
  const [newLoginPassword, setNewLoginPassword] = useState('');
  const [newLoginRole, setNewLoginRole] = useState<'user' | 'admin'>('user');
  const [newLoginLoading, setNewLoginLoading] = useState(false);
  const [newLoginError, setNewLoginError] = useState<string | null>(null);
  const [newLoginSuccess, setNewLoginSuccess] = useState<string | null>(null);

  const handleCreateCloudLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAdmin || newLoginLoading) return;

    const name = newLoginName.trim();
    const email = newLoginEmail.trim().toLowerCase();
    const password = newLoginPassword;

    if (!name || !email || password.length < 8) {
      setNewLoginError('Preencha nome, email e senha com no mínimo 8 caracteres.');
      setNewLoginSuccess(null);
      return;
    }

    setNewLoginLoading(true);
    setNewLoginError(null);
    setNewLoginSuccess(null);
    try {
      const response = await window.desktopWebApi?.request({
        method: 'POST',
        path: '/users',
        body: { name, email, password, role: newLoginRole }
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Não foi possível criar o login.');
      }

      setNewLoginName('');
      setNewLoginEmail('');
      setNewLoginPassword('');
      setNewLoginRole('user');
      setNewLoginSuccess('Login cloud criado com sucesso.');
    } catch (error) {
      setNewLoginError(error instanceof Error ? error.message : 'Erro ao criar login cloud.');
    } finally {
      setNewLoginLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-300">
              Preferências do sistema
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
              Ajustes gerais e gestão de acessos cloud
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400 sm:text-base">
              A operação agora é centralizada em login web e banco cloud, sem gestão local de perfis.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {SETTINGS_CARDS.map((card) => (
              <div key={card.title} className="mini-stat">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{card.title}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{card.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {isAdmin ? (
        <section className="card p-5 sm:p-6">
          <div className="mb-5">
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Criar login cloud</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Cadastre novos usuários de acesso no banco cloud sem sair do desktop.
            </p>
          </div>

          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateCloudLogin}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Nome</span>
              <input
                className="input-control"
                value={newLoginName}
                onChange={(event) => setNewLoginName(event.target.value)}
                placeholder="Nome completo"
                disabled={newLoginLoading}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Email</span>
              <input
                className="input-control"
                type="email"
                value={newLoginEmail}
                onChange={(event) => setNewLoginEmail(event.target.value)}
                placeholder="usuario@empresa.com"
                disabled={newLoginLoading}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Senha</span>
              <input
                className="input-control"
                type="password"
                minLength={8}
                value={newLoginPassword}
                onChange={(event) => setNewLoginPassword(event.target.value)}
                placeholder="Mínimo 8 caracteres"
                disabled={newLoginLoading}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Tipo</span>
              <select
                className="input-control"
                value={newLoginRole}
                onChange={(event) => setNewLoginRole(event.target.value === 'admin' ? 'admin' : 'user')}
                disabled={newLoginLoading}
              >
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
              </select>
            </label>
            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <button type="submit" className="btn-primary px-5" disabled={newLoginLoading}>
                {newLoginLoading ? 'Criando...' : 'Criar login'}
              </button>
              {newLoginSuccess ? (
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">{newLoginSuccess}</span>
              ) : null}
              {newLoginError ? (
                <span className="text-sm font-semibold text-rose-600 dark:text-rose-300">{newLoginError}</span>
              ) : null}
            </div>
          </form>
        </section>
      ) : (
        <section className="card p-5 sm:p-6">
          <div className="surface-subtle">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Acesso de operador</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              A criação de novos logins cloud fica disponível somente para administradores.
            </p>
          </div>
        </section>
      )}
    </div>
  );
};
