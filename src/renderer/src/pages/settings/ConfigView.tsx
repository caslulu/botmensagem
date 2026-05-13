import React, { useEffect, useMemo, useState } from 'react';
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
  const [activeTab, setActiveTab] = useState<'general' | 'users'>('general');
  const [newLoginName, setNewLoginName] = useState('');
  const [newLoginEmail, setNewLoginEmail] = useState('');
  const [newLoginPassword, setNewLoginPassword] = useState('');
  const [newLoginRole, setNewLoginRole] = useState<'user' | 'admin'>('user');
  const [newLoginLoading, setNewLoginLoading] = useState(false);
  const [newLoginError, setNewLoginError] = useState<string | null>(null);
  const [newLoginSuccess, setNewLoginSuccess] = useState<string | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role: string; isActive?: boolean }>>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [selfCurrentPassword, setSelfCurrentPassword] = useState('');
  const [selfNewPassword, setSelfNewPassword] = useState('');
  const [selfConfirmPassword, setSelfConfirmPassword] = useState('');
  const [selfPasswordLoading, setSelfPasswordLoading] = useState(false);
  const [selfPasswordError, setSelfPasswordError] = useState<string | null>(null);
  const [selfPasswordSuccess, setSelfPasswordSuccess] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState('');
  const [targetNewPassword, setTargetNewPassword] = useState('');
  const [targetConfirmPassword, setTargetConfirmPassword] = useState('');
  const [targetPasswordLoading, setTargetPasswordLoading] = useState(false);
  const [targetPasswordError, setTargetPasswordError] = useState<string | null>(null);
  const [targetPasswordSuccess, setTargetPasswordSuccess] = useState<string | null>(null);
  const [deleteUserLoadingId, setDeleteUserLoadingId] = useState<string | null>(null);
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null);
  const [deleteUserSuccess, setDeleteUserSuccess] = useState<string | null>(null);

  const nonSelfUsers = useMemo(() => users.filter((user) => user.id !== authUser?.id), [authUser?.id, users]);

  const loadUsers = async () => {
    if (!isAdmin) return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      const response = await window.desktopWebApi?.request({
        method: 'GET',
        path: '/users'
      });
      if (!response?.success) {
        throw new Error(response?.error || 'Não foi possível carregar usuários.');
      }
      const payload = (response.data as any)?.users;
      const list = Array.isArray(payload) ? payload : Array.isArray(response.data) ? response.data : [];
      setUsers(
        list
          .filter((item: any) => item?.id && item?.name && item?.email)
          .map((item: any) => ({
            id: String(item.id),
            name: String(item.name),
            email: String(item.email),
            role: String(item.role || 'user'),
            isActive: item.isActive !== false
          }))
      );
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : 'Erro ao carregar usuários.');
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      void loadUsers();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!targetUserId && nonSelfUsers.length > 0) {
      setTargetUserId(nonSelfUsers[0].id);
    }
  }, [nonSelfUsers, targetUserId]);

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

  const handleChangeMyPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAdmin || selfPasswordLoading || !authUser?.id) return;
    if (!selfCurrentPassword || selfNewPassword.length < 8) {
      setSelfPasswordError('Informe senha atual e nova senha com no mínimo 8 caracteres.');
      setSelfPasswordSuccess(null);
      return;
    }
    if (selfNewPassword !== selfConfirmPassword) {
      setSelfPasswordError('A confirmação da nova senha não confere.');
      setSelfPasswordSuccess(null);
      return;
    }

    setSelfPasswordLoading(true);
    setSelfPasswordError(null);
    setSelfPasswordSuccess(null);
    try {
      const attempts = [
        { path: '/users/me/password', body: { currentPassword: selfCurrentPassword, newPassword: selfNewPassword } },
        { path: '/profile/password', body: { currentPassword: selfCurrentPassword, newPassword: selfNewPassword } },
        { path: `/users/${authUser.id}/password`, body: { currentPassword: selfCurrentPassword, password: selfNewPassword } }
      ];
      let lastError = 'Não foi possível alterar sua senha.';
      for (const attempt of attempts) {
        const response = await window.desktopWebApi?.request({ method: 'PATCH', path: attempt.path, body: attempt.body });
        if (response?.success) {
          setSelfCurrentPassword('');
          setSelfNewPassword('');
          setSelfConfirmPassword('');
          setSelfPasswordSuccess('Sua senha foi alterada com sucesso.');
          setSelfPasswordError(null);
          return;
        }
        lastError = response?.error || lastError;
      }
      throw new Error(lastError);
    } catch (error) {
      setSelfPasswordError(error instanceof Error ? error.message : 'Erro ao alterar sua senha.');
    } finally {
      setSelfPasswordLoading(false);
    }
  };

  const handleChangeUserPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAdmin || targetPasswordLoading || !targetUserId) return;
    if (targetNewPassword.length < 8) {
      setTargetPasswordError('A nova senha precisa ter no mínimo 8 caracteres.');
      setTargetPasswordSuccess(null);
      return;
    }
    if (targetNewPassword !== targetConfirmPassword) {
      setTargetPasswordError('A confirmação da senha não confere.');
      setTargetPasswordSuccess(null);
      return;
    }

    setTargetPasswordLoading(true);
    setTargetPasswordError(null);
    setTargetPasswordSuccess(null);
    try {
      const attempts = [
        { path: `/users/${targetUserId}/password`, body: { password: targetNewPassword } },
        { path: `/users/${targetUserId}`, body: { password: targetNewPassword } }
      ];
      let lastError = 'Não foi possível alterar a senha do usuário.';
      for (const attempt of attempts) {
        const response = await window.desktopWebApi?.request({ method: 'PATCH', path: attempt.path, body: attempt.body });
        if (response?.success) {
          setTargetNewPassword('');
          setTargetConfirmPassword('');
          setTargetPasswordSuccess('Senha do usuário alterada com sucesso.');
          setTargetPasswordError(null);
          return;
        }
        lastError = response?.error || lastError;
      }
      throw new Error(lastError);
    } catch (error) {
      setTargetPasswordError(error instanceof Error ? error.message : 'Erro ao alterar senha do usuário.');
    } finally {
      setTargetPasswordLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!isAdmin || !userId || deleteUserLoadingId) return;
    if (userId === authUser?.id) {
      setDeleteUserError('Você não pode excluir seu próprio usuário.');
      setDeleteUserSuccess(null);
      return;
    }

    const user = users.find((item) => item.id === userId);
    const confirmed = window.confirm(`Confirma excluir o usuário "${user?.name || userId}"?`);
    if (!confirmed) return;

    setDeleteUserLoadingId(userId);
    setDeleteUserError(null);
    setDeleteUserSuccess(null);
    try {
      const response = await window.desktopWebApi?.request({
        method: 'DELETE',
        path: `/users/${userId}`
      });
      if (!response?.success) {
        throw new Error(response?.error || 'Não foi possível excluir o usuário.');
      }
      setDeleteUserSuccess('Usuário excluído com sucesso.');
      await loadUsers();
    } catch (error) {
      setDeleteUserError(error instanceof Error ? error.message : 'Erro ao excluir usuário.');
    } finally {
      setDeleteUserLoadingId(null);
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
        <>
          <section className="card p-3 sm:p-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={activeTab === 'general' ? 'btn-primary px-4' : 'btn-secondary px-4'}
              >
                Geral
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={activeTab === 'users' ? 'btn-primary px-4' : 'btn-secondary px-4'}
              >
                Usuários e senhas
              </button>
            </div>
          </section>

          {activeTab === 'general' ? (
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
            <section className="space-y-6">
              <div className="card p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Usuários cadastrados</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Visualize todos os usuários do cloud.</p>
                  </div>
                  <button type="button" className="btn-secondary px-4" onClick={() => void loadUsers()} disabled={usersLoading}>
                    {usersLoading ? 'Atualizando...' : 'Atualizar lista'}
                  </button>
                </div>

                {usersError ? <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">{usersError}</p> : null}
                {deleteUserError ? <p className="mt-2 text-sm font-semibold text-rose-600 dark:text-rose-300">{deleteUserError}</p> : null}
                {deleteUserSuccess ? <p className="mt-2 text-sm font-semibold text-emerald-600 dark:text-emerald-300">{deleteUserSuccess}</p> : null}

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200/80 dark:border-slate-800">
                        <th className="py-2 pr-3 font-semibold text-slate-700 dark:text-slate-300">Nome</th>
                        <th className="py-2 pr-3 font-semibold text-slate-700 dark:text-slate-300">Email</th>
                        <th className="py-2 pr-3 font-semibold text-slate-700 dark:text-slate-300">Tipo</th>
                        <th className="py-2 pr-3 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                        <th className="py-2 pr-3 font-semibold text-slate-700 dark:text-slate-300">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-slate-200/70 dark:border-slate-800/80">
                          <td className="py-2 pr-3 text-slate-700 dark:text-slate-200">{user.name}</td>
                          <td className="py-2 pr-3 text-slate-500 dark:text-slate-400">{user.email}</td>
                          <td className="py-2 pr-3 text-slate-500 dark:text-slate-400">{user.role === 'admin' ? 'Administrador' : 'Usuário'}</td>
                          <td className="py-2 pr-3 text-slate-500 dark:text-slate-400">{user.isActive === false ? 'Inativo' : 'Ativo'}</td>
                          <td className="py-2 pr-3">
                            <button
                              type="button"
                              className="btn-secondary px-3 py-1 text-xs"
                              onClick={() => void handleDeleteUser(user.id)}
                              disabled={deleteUserLoadingId !== null || user.id === authUser?.id}
                              title={user.id === authUser?.id ? 'Não é possível excluir seu próprio usuário' : 'Excluir usuário'}
                            >
                              {deleteUserLoadingId === user.id ? 'Excluindo...' : 'Excluir'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="card p-5 sm:p-6">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Trocar minha senha</h3>
                  <form className="mt-4 space-y-4" onSubmit={handleChangeMyPassword}>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Senha atual</span>
                      <input
                        className="input-control"
                        type="password"
                        value={selfCurrentPassword}
                        onChange={(event) => setSelfCurrentPassword(event.target.value)}
                        disabled={selfPasswordLoading}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Nova senha</span>
                      <input
                        className="input-control"
                        type="password"
                        minLength={8}
                        value={selfNewPassword}
                        onChange={(event) => setSelfNewPassword(event.target.value)}
                        disabled={selfPasswordLoading}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Confirmar nova senha</span>
                      <input
                        className="input-control"
                        type="password"
                        minLength={8}
                        value={selfConfirmPassword}
                        onChange={(event) => setSelfConfirmPassword(event.target.value)}
                        disabled={selfPasswordLoading}
                      />
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <button className="btn-primary px-5" type="submit" disabled={selfPasswordLoading}>
                        {selfPasswordLoading ? 'Alterando...' : 'Alterar minha senha'}
                      </button>
                      {selfPasswordSuccess ? <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">{selfPasswordSuccess}</span> : null}
                      {selfPasswordError ? <span className="text-sm font-semibold text-rose-600 dark:text-rose-300">{selfPasswordError}</span> : null}
                    </div>
                  </form>
                </div>

                <div className="card p-5 sm:p-6">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Trocar senha de usuário</h3>
                  <form className="mt-4 space-y-4" onSubmit={handleChangeUserPassword}>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Usuário</span>
                      <select
                        className="input-control"
                        value={targetUserId}
                        onChange={(event) => setTargetUserId(event.target.value)}
                        disabled={targetPasswordLoading || nonSelfUsers.length === 0}
                      >
                        {nonSelfUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Nova senha</span>
                      <input
                        className="input-control"
                        type="password"
                        minLength={8}
                        value={targetNewPassword}
                        onChange={(event) => setTargetNewPassword(event.target.value)}
                        disabled={targetPasswordLoading || nonSelfUsers.length === 0}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Confirmar nova senha</span>
                      <input
                        className="input-control"
                        type="password"
                        minLength={8}
                        value={targetConfirmPassword}
                        onChange={(event) => setTargetConfirmPassword(event.target.value)}
                        disabled={targetPasswordLoading || nonSelfUsers.length === 0}
                      />
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <button className="btn-primary px-5" type="submit" disabled={targetPasswordLoading || nonSelfUsers.length === 0}>
                        {targetPasswordLoading ? 'Alterando...' : 'Alterar senha do usuário'}
                      </button>
                      {targetPasswordSuccess ? <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">{targetPasswordSuccess}</span> : null}
                      {targetPasswordError ? <span className="text-sm font-semibold text-rose-600 dark:text-rose-300">{targetPasswordError}</span> : null}
                    </div>
                  </form>
                </div>
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="card p-5 sm:p-6">
          <div className="surface-subtle">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Acesso de operador</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Gestão de usuários e alteração de senhas ficam disponíveis somente para administradores.
            </p>
          </div>
        </section>
      )}
    </div>
  );
};
