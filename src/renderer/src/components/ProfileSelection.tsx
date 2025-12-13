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
      <div className="card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-white">Selecione quem vai disparar</h2>
          </div>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" id="profilesContainer">
        {profiles.length === 0 && (
          <p className="text-slate-400 text-center col-span-full py-8">Nenhum perfil cadastrado ainda.</p>
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
          className="profile-card add-profile-card border-2 border-dashed border-slate-700 bg-slate-900/50 flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-slate-400 hover:text-brand-500 hover:border-brand-500 transition"
          onClick={onAddProfile}
          disabled={profiles.length >= MAX_PROFILES || !selectionEnabled}
        >
          <span className="add-profile-icon text-3xl">+</span>
          <span className="profile-name">Adicionar operador</span>
          <span className="text-xs text-slate-400 mt-1">
            {profiles.length >= MAX_PROFILES
              ? `Limite de ${MAX_PROFILES} perfis atingido`
              : `Cadastre até ${MAX_PROFILES} perfis diferentes.`}
          </span>
        </button>
      </div>
    </section>
  );
};
