import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Save, ShieldCheck, UserPlus } from 'lucide-react';
import { api } from '../../api/client';
import type { ManagedUser } from '../../types';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  user: 'Padrao'
};

type EditableUser = ManagedUser & {
  draftName: string;
  draftEmail: string;
  draftRole: string;
  draftIsActive: boolean;
  draftPassword: string;
  saving?: boolean;
};

function toEditableUser(user: ManagedUser): EditableUser {
  return {
    ...user,
    draftName: user.name,
    draftEmail: user.email,
    draftRole: user.role,
    draftIsActive: user.isActive,
    draftPassword: ''
  };
}

export function AdminView() {
  const [users, setUsers] = useState<EditableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingNewUser, setSavingNewUser] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<{ users: ManagedUser[] }>('/users');
      setUsers(response.users.map(toEditableUser));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar usuarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingNewUser || newUser.password.length < 8) return;
    setSavingNewUser(true);
    setError('');
    setMessage('');

    try {
      await api.post('/users', {
        name: newUser.name.trim(),
        email: newUser.email.trim().toLowerCase(),
        password: newUser.password,
        role: newUser.role
      });
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      setMessage('Usuario criado.');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel criar o usuario.');
    } finally {
      setSavingNewUser(false);
    }
  };

  const patchDraft = (id: string, patch: Partial<EditableUser>) => {
    setUsers((current) => current.map((user) => (user.id === id ? { ...user, ...patch } : user)));
  };

  const saveUser = async (user: EditableUser) => {
    patchDraft(user.id, { saving: true });
    setError('');
    setMessage('');

    try {
      await api.patch(`/users/${user.id}`, {
        name: user.draftName.trim(),
        email: user.draftEmail.trim().toLowerCase(),
        role: user.draftRole,
        isActive: user.draftIsActive,
        ...(user.draftPassword ? { password: user.draftPassword } : {})
      });
      setMessage('Usuario atualizado.');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel salvar o usuario.');
      patchDraft(user.id, { saving: false });
    }
  };

  return (
    <div className="admin-page">
      <section className="command-band admin-intro">
        <div>
          <p className="eyebrow">Espaco admin</p>
          <h2>Usuarios</h2>
          <p>Crie acessos internos, promova administradores e controle quem continua ativo na aplicacao.</p>
        </div>
        <ShieldCheck size={36} />
      </section>

      {error ? <div className="notice-error">{error}</div> : null}
      {message ? <div className="success-note">{message}</div> : null}

      <form className="form-section admin-create-form" onSubmit={createUser}>
        <h3>Novo usuario</h3>
        <div className="form-grid compact-grid">
          <label className="field" htmlFor="new-user-name">
            <span>Nome</span>
            <input
              id="new-user-name"
              className="control"
              value={newUser.name}
              disabled={savingNewUser}
              onChange={(event) => setNewUser((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <label className="field" htmlFor="new-user-email">
            <span>Email</span>
            <input
              id="new-user-email"
              className="control"
              type="email"
              value={newUser.email}
              disabled={savingNewUser}
              onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))}
            />
          </label>
          <label className="field" htmlFor="new-user-role">
            <span>Tipo</span>
            <select
              id="new-user-role"
              className="control"
              value={newUser.role}
              disabled={savingNewUser}
              onChange={(event) => setNewUser((current) => ({ ...current, role: event.target.value }))}
            >
              <option value="user">Padrao</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="field" htmlFor="new-user-password">
            <span>Senha inicial</span>
            <input
              id="new-user-password"
              className="control"
              type="password"
              value={newUser.password}
              minLength={8}
              disabled={savingNewUser}
              onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))}
            />
          </label>
        </div>
        <button
          className="primary-button"
          type="submit"
          disabled={!newUser.name.trim() || !newUser.email.trim() || newUser.password.length < 8 || savingNewUser}
        >
          <UserPlus size={16} /> {savingNewUser ? 'Criando...' : 'Criar usuario'}
        </button>
      </form>

      {loading ? <div className="loading-strip">Carregando usuarios...</div> : null}

      <section className="user-list" aria-label="Usuarios cadastrados">
        {users.map((user) => (
          <article className={`user-row ${!user.draftIsActive ? 'is-disabled' : ''}`} key={user.id}>
            <div className="avatar-frame">
              {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} /> : <span>{user.name.slice(0, 1).toUpperCase()}</span>}
            </div>
            <div className="user-edit-grid">
              <label className="field" htmlFor={`user-name-${user.id}`}>
                <span>Nome</span>
                <input
                  id={`user-name-${user.id}`}
                  className="control"
                  value={user.draftName}
                  disabled={user.saving}
                  onChange={(event) => patchDraft(user.id, { draftName: event.target.value })}
                />
              </label>
              <label className="field" htmlFor={`user-email-${user.id}`}>
                <span>Email</span>
                <input
                  id={`user-email-${user.id}`}
                  className="control"
                  type="email"
                  value={user.draftEmail}
                  disabled={user.saving}
                  onChange={(event) => patchDraft(user.id, { draftEmail: event.target.value })}
                />
              </label>
              <label className="field" htmlFor={`user-role-${user.id}`}>
                <span>Tipo</span>
                <select
                  id={`user-role-${user.id}`}
                  className="control"
                  value={user.draftRole}
                  disabled={user.saving}
                  onChange={(event) => patchDraft(user.id, { draftRole: event.target.value })}
                >
                  <option value="user">Padrao</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label className="field" htmlFor={`user-password-${user.id}`}>
                <span>Nova senha</span>
                <input
                  id={`user-password-${user.id}`}
                  className="control"
                  type="password"
                  value={user.draftPassword}
                  disabled={user.saving}
                  placeholder="Manter atual"
                  onChange={(event) => patchDraft(user.id, { draftPassword: event.target.value })}
                />
              </label>
            </div>
            <div className="user-row-actions">
              <label className="toggle-line">
                <input
                  type="checkbox"
                  checked={user.draftIsActive}
                  disabled={user.saving}
                  onChange={(event) => patchDraft(user.id, { draftIsActive: event.target.checked })}
                />
                <span>{user.draftIsActive ? 'Ativo' : 'Inativo'}</span>
              </label>
              <span className="role-chip">{ROLE_LABELS[user.role] || user.role}</span>
              <button className="secondary-button" type="button" disabled={user.saving} onClick={() => saveUser(user)}>
                <Save size={16} /> {user.saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
