import React, { useState, useEffect } from 'react';
import { useProfileContext } from '../../app/providers';

function getInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return 'IH';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export const ProfileSettingsView: React.FC = () => {
  const { profiles, selectedProfileId, updateProfile, reloadProfiles } = useProfileContext();
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);

  const [name, setName] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (selectedProfile) {
      setName(selectedProfile.name || '');
      setImagePath('');
    }
  }, [selectedProfile]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProfile || !name) return;

    setLoading(true);
    setError(undefined);
    setSuccess(false);

    try {
      const result = await updateProfile(selectedProfile.id, {
        name,
        imagePath: imagePath || ''
      });

      if (!result?.success) {
        setError(result?.error || 'Falha ao atualizar perfil.');
        return;
      }

      await reloadProfiles();
      setSuccess(true);
      setImagePath('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (updateError) {
      const message = (updateError && typeof updateError === 'object' && 'message' in updateError)
        ? (updateError as { message: string }).message
        : 'Erro ao atualizar perfil.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedProfile) {
    return (
      <section className="card p-6">
        <p className="text-slate-500 dark:text-slate-400">Nenhum perfil selecionado.</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-300">
              Seu perfil
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
              Atualize seu nome e avatar
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400 sm:text-base">
              Mantenha seus dados organizados para facilitar identificação da sessão e operação diária.
            </p>
          </div>

          <div className="surface-subtle flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[24px] bg-white text-lg font-semibold text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-100">
              {selectedProfile.thumbnail ? (
                <img
                  src={selectedProfile.thumbnail}
                  alt={`Foto de ${selectedProfile.name}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(selectedProfile.name)
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedProfile.name}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedProfile.id}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="card p-5 sm:p-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Nome do operador</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Ex: Joana"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Identificador (ID)</label>
                <input
                  type="text"
                  className="input-control cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-500"
                  value={selectedProfile.id}
                  disabled
                />
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                  Esse identificador é fixo e usado internamente pelo app.
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Imagem do perfil</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  className="input-control flex-1"
                  placeholder="Selecione um arquivo de imagem ou deixe vazio para manter a atual"
                  value={imagePath}
                  onChange={(event) => setImagePath(event.target.value)}
                />
                <button
                  type="button"
                  className="btn-secondary whitespace-nowrap px-4"
                  onClick={async () => {
                    try {
                      const result = await window.files?.selectImage();
                      if (result?.success && result.path) setImagePath(result.path);
                    } catch {
                      // noop
                    }
                  }}
                >
                  📁 Selecionar
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Se você não escolher uma nova imagem, o avatar atual continua valendo.
              </p>
            </div>

            {error ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                Perfil atualizado com sucesso.
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-slate-200/80 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
              <button className="btn-primary px-8" type="submit" disabled={loading}>
                {loading ? 'Salvando…' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="surface-subtle">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">O que muda aqui</p>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Nome e imagem ajudam a identificar rapidamente o operador correto dentro do sistema.
            </p>
          </div>
          <div className="surface-subtle">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Boas práticas</p>
            <ul className="mt-3 space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <li>Use um nome claro e fácil de reconhecer.</li>
              <li>Mantenha o avatar consistente entre os operadores.</li>
              <li>Evite trocar o perfil durante um fluxo em andamento.</li>
            </ul>
          </div>
        </aside>
      </section>
    </div>
  );
};
