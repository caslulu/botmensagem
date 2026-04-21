import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Camera, KeyRound, Save } from 'lucide-react';
import { api } from '../../api/client';
import type { AuthUser } from '../../types';

type Props = {
  user: AuthUser;
  onUserChange: (user: AuthUser) => void;
};

export function ProfileView({ user, onUserChange }: Props) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [error, setError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
  }, [user.email, user.name]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingProfile) return;
    setSavingProfile(true);
    setError('');
    setProfileMessage('');

    try {
      const response = await api.patch<{ user: AuthUser }>('/profile', {
        name: name.trim(),
        email: email.trim().toLowerCase()
      });
      onUserChange(response.user);
      setProfileMessage('Perfil atualizado.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel atualizar o perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingPassword || newPassword.length < 8) return;
    setSavingPassword(true);
    setError('');
    setPasswordMessage('');

    try {
      await api.patch('/profile/password', {
        currentPassword,
        newPassword
      });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordMessage('Senha alterada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel alterar a senha.');
    } finally {
      setSavingPassword(false);
    }
  };

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || uploadingAvatar) return;
    setUploadingAvatar(true);
    setError('');
    setProfileMessage('');

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await api.upload<{ user: AuthUser }>('/profile/avatar', formData);
      onUserChange(response.user);
      setProfileMessage('Foto atualizada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel enviar a foto.');
    } finally {
      event.target.value = '';
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="profile-page">
      <section className="profile-hero">
        <div className="avatar-frame large-avatar">
          {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} /> : <span>{user.name.slice(0, 1).toUpperCase()}</span>}
        </div>
        <div>
          <p className="eyebrow">{user.role === 'admin' ? 'Administrador' : 'Usuario'}</p>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
        </div>
        <label className="secondary-button avatar-upload">
          <Camera size={16} /> {uploadingAvatar ? 'Enviando...' : 'Foto'}
          <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploadingAvatar} onChange={uploadAvatar} />
        </label>
      </section>

      {error ? <div className="notice-error">{error}</div> : null}

      <div className="settings-grid">
        <form className="form-section settings-panel" onSubmit={saveProfile}>
          <h3>Dados do perfil</h3>
          <label className="field" htmlFor="profile-name">
            <span>Nome</span>
            <input id="profile-name" className="control" value={name} disabled={savingProfile} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="field" htmlFor="profile-email">
            <span>Email</span>
            <input
              id="profile-email"
              className="control"
              type="email"
              value={email}
              disabled={savingProfile}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          {profileMessage ? <div className="success-note">{profileMessage}</div> : null}
          <button className="primary-button" type="submit" disabled={!name.trim() || !email.trim() || savingProfile}>
            <Save size={16} /> {savingProfile ? 'Salvando...' : 'Salvar perfil'}
          </button>
        </form>

        <form className="form-section settings-panel" onSubmit={changePassword}>
          <h3>Senha</h3>
          <label className="field" htmlFor="current-password">
            <span>Senha atual</span>
            <input
              id="current-password"
              className="control"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              disabled={savingPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </label>
          <label className="field" htmlFor="new-password">
            <span>Nova senha</span>
            <input
              id="new-password"
              className="control"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              disabled={savingPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </label>
          {passwordMessage ? <div className="success-note">{passwordMessage}</div> : null}
          <button className="primary-button" type="submit" disabled={currentPassword.length < 8 || newPassword.length < 8 || savingPassword}>
            <KeyRound size={16} /> {savingPassword ? 'Alterando...' : 'Alterar senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
