import React from 'react';
import { ProfileCard, Profile } from './ProfileCard';

const MAX_PROFILES = 10;

export const ProfileSelection: React.FC<{
  profiles: Profile[];
  selectedProfileId: string | null;
  onSelect: (id: string) => void;
  onAddProfile: () => void;
  selectionEnabled?: boolean;
}> = ({ profiles, selectedProfileId, onSelect, onAddProfile, selectionEnabled = true }) => {
  return (
    <section className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" id="profilesContainer">
        {profiles.length === 0 && (
          <div className="surface-subtle col-span-full py-10 text-center">
            <p className="text-base font-semibold text-slate-800 dark:text-white">Nenhum perfil cadastrado ainda.</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Crie o primeiro operador para começar a usar o sistema.
            </p>
          </div>
        )}
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            selected={selectedProfileId === profile.id}
            disabled={!selectionEnabled}
            onSelect={onSelect}
          />
        ))}
        <button
          type="button"
          className="group flex min-h-[132px] items-center gap-4 rounded-[28px] border border-dashed border-slate-300 bg-slate-50/78 p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50/60 dark:border-slate-700 dark:bg-slate-900/45 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10"
          onClick={onAddProfile}
          disabled={profiles.length >= MAX_PROFILES || !selectionEnabled}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-slate-400 shadow-sm transition-colors group-hover:bg-brand-100 group-hover:text-brand-600 dark:bg-slate-800 dark:group-hover:bg-brand-500/20 dark:group-hover:text-brand-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="flex-1">
            <span className="block font-semibold text-slate-700 transition-colors group-hover:text-brand-700 dark:text-slate-200 dark:group-hover:text-brand-200">
              Adicionar operador
            </span>
            <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">
              {profiles.length >= MAX_PROFILES
                ? 'Limite de perfis atingido'
                : 'Crie um novo acesso para separar sessões e configurações.'}
            </span>
          </div>
        </button>
      </div>
    </section>
  );
};
