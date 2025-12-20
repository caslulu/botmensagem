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
    <div
      className={`profile-card group relative bg-white dark:bg-slate-800 rounded-xl p-4 border transition-all duration-300 ${
        selected 
          ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-md' 
          : 'border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-card-hover'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      data-profile-id={profile.id}
      data-active={selected ? 'true' : 'false'}
      onClick={() => !disabled && onSelect(profile.id)}
      style={{ pointerEvents: disabled ? 'none' : 'auto' }}
    >
      <div className="flex items-center gap-4">
        <div className={`profile-thumbnail w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 ${selected ? 'border-brand-500' : 'border-slate-100 dark:border-slate-700 group-hover:border-brand-200 dark:group-hover:border-brand-800'} transition-colors`}>
          {profile.thumbnail && !imgError ? (
            <img
              src={profile.thumbnail}
              alt={`Foto de ${profile.name}`}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold text-lg bg-slate-50 dark:bg-slate-900">
              {getInitials(profile.name)}
            </div>
          )}
        </div>
        
        <div className="profile-info flex-1 min-w-0">
          <p className={`profile-name font-semibold truncate transition-colors ${selected ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400'}`}>
            {profile.name}
          </p>
          {profile.isAdmin ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 mt-1">
              Admin
            </span>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">Operador</span>
          )}
        </div>
        
        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
          selected 
            ? 'bg-brand-500 border-brand-500 text-white' 
            : 'border-slate-300 dark:border-slate-600 group-hover:border-brand-400'
        }`}>
          {selected && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
      
      <input
        type="radio"
        name="profile"
        value={profile.id}
        checked={selected}
        readOnly
        className="hidden"
      />
    </div>
  );
};
