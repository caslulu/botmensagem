import React, { useEffect, useState } from 'react';
import { ProfileCard, Profile } from './ProfileCard';

const MAX_PROFILES = 5;

export const ProfileSelection: React.FC<{
  profiles: Profile[];
  selectedProfileId: string | null;
  onSelect: (id: string) => void;
  onAddProfile: () => void;
  selectionEnabled?: boolean;
}> = ({ profiles, selectedProfileId, onSelect, onAddProfile, selectionEnabled = true }) => {
  return (
    <section className="flex flex-col gap-6">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" id="profilesContainer">
        {profiles.length === 0 && (
          <p className="text-slate-500 dark:text-slate-400 text-center col-span-full py-8">Nenhum perfil cadastrado ainda.</p>
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
          className="group flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-400 dark:hover:border-brand-600 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition-all duration-200 text-left"
          onClick={onAddProfile}
          disabled={profiles.length >= MAX_PROFILES || !selectionEnabled}
        >
          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/30 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="flex-1">
            <span className="block font-medium text-slate-600 dark:text-slate-300 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              Adicionar operador
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 block">
              {profiles.length >= MAX_PROFILES
                ? 'Limite atingido'
                : 'Novo perfil'}
            </span>
          </div>
        </button>
      </div>
    </section>
  );
};
