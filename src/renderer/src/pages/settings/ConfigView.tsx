import React, { useState } from 'react';
import { useProfileContext } from '../../app/providers';
import { ProfileEditModal } from '../../components/profile/ProfileEditModal';
import type { Profile } from '../../components/profile/ProfileCard';

export const ConfigView: React.FC = () => {
  const { profiles, selectedProfileId, reloadProfiles, updateProfile, deleteProfile } = useProfileContext();
  const currentProfile = profiles.find(p => p.id === selectedProfileId);
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
    } catch (err) {
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
    } catch (err) {
      alert('Erro ao deletar perfil');
    }
  };

  return (
    <section className="card p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">Configurações</h2>
        <p className="text-slate-500 dark:text-slate-300 text-sm">Ajuste preferências gerais do aplicativo.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Tema</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Use o botão no topo para alternar claro/escuro.</p>
        </div>
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Notificações</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Configure alertas de automação e lembretes (em breve).</p>
        </div>
      </div>

      {isAdmin && (
        <div className="space-y-4">
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Todos os perfis</h3>
            <p className="text-slate-500 dark:text-slate-300 text-sm">Gerencie todos os perfis cadastrados no sistema.</p>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-200">{profile.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{profile.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {profile.isAdmin ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400">
                          Operador
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => handleEdit(profile)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        Editar
                      </button>
                      {!profile.isAdmin && (
                        <button
                          onClick={() => handleDelete(profile.id)}
                          className="text-rose-600 hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-300"
                        >
                          Excluir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ProfileEditModal
        open={isEditModalOpen}
        profile={editingProfile}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSave}
        loading={editLoading}
        error={editError}
      />

      <div className="text-xs text-slate-400 dark:text-slate-500">Mais opções chegarão aqui.</div>
    </section>
  );
};
