import React, { useState } from 'react';
import { useProfileContext } from '../../app/providers';
import { ProfileEditModal } from '../../components/profile/ProfileEditModal';
import type { Profile } from '../../components/profile/ProfileCard';

const SETTINGS_CARDS = [
  {
    title: 'Tema',
    detail: 'Use o botão no topo para alternar entre modo claro e escuro.'
  },
  {
    title: 'Sessões por perfil',
    detail: 'Cada operador mantém sua própria sessão e preferências separadas.'
  },
  {
    title: 'Notificações',
    detail: 'A área está reservada para alertas e lembretes futuros.'
  }
];

function ProfileTypeBadge({ isAdmin }: { isAdmin?: boolean }) {
  return isAdmin ? (
    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
      Admin
    </span>
  ) : (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-800 dark:text-slate-300">
      Operador
    </span>
  );
}

export const ConfigView: React.FC = () => {
  const { profiles, selectedProfileId, reloadProfiles, updateProfile, deleteProfile } = useProfileContext();
  const currentProfile = profiles.find((p) => p.id === selectedProfileId);
  const isAdmin = currentProfile?.isAdmin;

  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | undefined>(undefined);

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setIsEditModalOpen(true);
    setEditError(undefined);
  };

  const handleSave = async (updates: { name: string; imagePath?: string }) => {
    if (!editingProfile) return;
    setEditLoading(true);
    setEditError(undefined);
    try {
      const result = await updateProfile(editingProfile.id, updates);
      if (result.success) {
        await reloadProfiles();
        setIsEditModalOpen(false);
      } else {
        setEditError(result.error);
      }
    } catch {
      setEditError('Erro ao salvar perfil');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (profileId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este perfil? Esta ação não pode ser desfeita.')) {
      return;
    }
    try {
      const result = await deleteProfile(profileId);
      if (result.success) {
        await reloadProfiles();
      } else {
        alert(result.error || 'Erro ao deletar perfil');
      }
    } catch {
      alert('Erro ao deletar perfil');
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
              Ajustes gerais e manutenção de perfis
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400 sm:text-base">
              Tudo o que afeta a experiência do app fica reunido aqui. Se você for administrador, também pode revisar e editar todos os perfis cadastrados.
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
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Todos os perfis</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Revise, edite ou remova perfis cadastrados no sistema.
              </p>
            </div>
            <span className="status-pill">{profiles.length} perfil{profiles.length === 1 ? '' : 's'}</span>
          </div>

          <div className="grid gap-3 md:hidden">
            {profiles.map((profile) => (
              <article key={profile.id} className="surface-subtle">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-slate-900 dark:text-white">{profile.name}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{profile.id}</p>
                  </div>
                  <ProfileTypeBadge isAdmin={profile.isAdmin} />
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleEdit(profile)}
                    className="btn-secondary min-h-[40px] px-3 py-2 text-xs"
                  >
                    Editar
                  </button>
                  {!profile.isAdmin ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(profile.id)}
                      className="btn-danger min-h-[40px] px-3 py-2 text-xs"
                    >
                      Excluir
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <div className="table-responsive hidden md:block">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50/85 dark:bg-slate-900/80">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Nome</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Tipo</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/70 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">{profile.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{profile.id}</td>
                    <td className="px-6 py-4 text-sm"><ProfileTypeBadge isAdmin={profile.isAdmin} /></td>
                    <td className="px-6 py-4 text-right text-sm">
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => handleEdit(profile)}
                          className="text-sm font-semibold text-brand-700 transition-colors hover:text-brand-900 dark:text-brand-300 dark:hover:text-brand-100"
                        >
                          Editar
                        </button>
                        {!profile.isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(profile.id)}
                            className="text-sm font-semibold text-rose-600 transition-colors hover:text-rose-800 dark:text-rose-300 dark:hover:text-rose-100"
                          >
                            Excluir
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="card p-5 sm:p-6">
          <div className="surface-subtle">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Acesso de operador</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              As configurações avançadas de perfis ficam disponíveis somente para administradores. Você ainda pode alternar o tema e manter sua operação normalmente.
            </p>
          </div>
        </section>
      )}

      <ProfileEditModal
        open={isEditModalOpen}
        profile={editingProfile}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSave}
        loading={editLoading}
        error={editError}
      />
    </div>
  );
};
