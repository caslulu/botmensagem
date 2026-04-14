import React, { useState } from 'react';

export interface Profile {
  id: string;
  name: string;
  thumbnail?: string;
  isAdmin?: boolean;
}

interface ProfileCardProps {
  profile: Profile;
  selected: boolean;
  disabled?: boolean;
  onSelect: (id: string) => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ profile, selected, disabled, onSelect }) => {
  const [imgError, setImgError] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <button
      type="button"
      className={`profile-card group relative flex min-h-[132px] w-full items-start gap-4 rounded-[28px] border p-5 text-left transition-all duration-300 ${
        selected 
          ? 'border-brand-300 bg-brand-50/75 ring-4 ring-brand-500/10 shadow-card dark:border-brand-500/25 dark:bg-brand-500/10' 
          : 'border-slate-200/80 bg-white/88 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover dark:border-slate-800/80 dark:bg-slate-900/78 dark:hover:border-brand-500/20'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      data-profile-id={profile.id}
      data-active={selected ? 'true' : 'false'}
      onClick={() => !disabled && onSelect(profile.id)}
      disabled={disabled}
      aria-pressed={selected}
    >
      <div className={`profile-thumbnail flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border-2 ${selected ? 'border-brand-400' : 'border-slate-100 group-hover:border-brand-200 dark:border-slate-700 dark:group-hover:border-brand-500/20'} bg-white transition-colors dark:bg-slate-800`}>
        {profile.thumbnail && !imgError ? (
          <img
            src={profile.thumbnail}
            alt={`Foto de ${profile.name}`}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-50 text-lg font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-200">
            {getInitials(profile.name)}
          </div>
        )}
      </div>
      
      <div className="profile-info min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`profile-name truncate text-base font-semibold transition-colors ${selected ? 'text-brand-800 dark:text-brand-100' : 'text-slate-800 group-hover:text-brand-700 dark:text-slate-100 dark:group-hover:text-brand-200'}`}>
            {profile.name}
          </p>
          {profile.isAdmin ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
              Admin
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              Operador
            </span>
          )}
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {selected ? 'Perfil pronto para entrar no sistema.' : 'Clique para usar este perfil e abrir os módulos.'}
        </p>
      </div>
      
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all ${
        selected 
          ? 'border-brand-500 bg-brand-500 text-white' 
          : 'border-slate-200 bg-white text-slate-400 group-hover:border-brand-200 group-hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500 dark:group-hover:border-brand-500/20 dark:group-hover:text-brand-200'
      }`}>
        {selected ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <span className="text-base">→</span>
        )}
      </div>
      
      <input
        type="radio"
        name="profile"
        value={profile.id}
        checked={selected}
        readOnly
        className="hidden"
      />
    </button>
  );
};
