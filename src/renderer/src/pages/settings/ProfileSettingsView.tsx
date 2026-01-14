import React, { useState, useEffect } from 'react';
import { useProfileContext } from '../../app/providers';

export const ProfileSettingsView: React.FC = () => {
  const { profiles, selectedProfileId, updateProfile, reloadProfiles } = useProfileContext();
  const selectedProfile = profiles.find(p => p.id === selectedProfileId);
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (e) {
      const message = (e && typeof e === 'object' && 'message' in e)
        ? (e as { message: string }).message
        : 'Erro ao atualizar perfil.'
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedProfile) {
      return (
          <section className="card p-6">
              <p className="text-slate-500">Nenhum perfil selecionado.</p>
          </section>
      )
  }

  return (
    <section className="card p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">Perfil</h2>
        <p className="text-slate-500 dark:text-slate-300 text-sm">Gerencie suas informações pessoais e aparência.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-3xl">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nome do operador</label>
              <input
                type="text"
                className="input-control w-full"
                placeholder="Ex: Joana"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Identificador (ID)</label>
              <input
                type="text"
                className="input-control w-full bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-500 cursor-not-allowed"
                value={selectedProfile.id}
                disabled
              />
              <p className="text-xs text-slate-400 mt-1">O ID é usado internamente e não pode ser alterado.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Imagem do perfil</label>
            <div className="flex gap-3">
              <input
                type="text"
                className="input-control flex-1"
                placeholder="Selecione um arquivo de imagem ou deixe vazio para manter a atual"
                value={imagePath}
                onChange={e => setImagePath(e.target.value)}
              />
              <button
                type="button"
                className="btn-secondary whitespace-nowrap px-4"
                onClick={async () => {
                  try {
                    // @ts-ignore
                    const result = await window.files?.selectImage();
                    if (result?.success && result.path) setImagePath(result.path);
                  } catch {}
                }}
              >
                📁 Selecionar
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                O avatar atual será mantido se você não selecionar uma nova imagem.
            </p>
          </div>

          {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm rounded-lg border border-rose-200 dark:border-rose-800">
                  {error}
              </div>
          )}

          {success && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm rounded-lg border border-emerald-200 dark:border-emerald-800">
                  Perfil atualizado com sucesso!
              </div>
          )}

          <div className="flex justify-end pt-4">
            <button className="btn-primary px-8" type="submit" disabled={loading}>
              {loading ? 'Salvando…' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
