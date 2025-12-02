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
      className={`profile-card group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      data-profile-id={profile.id}
      data-active={selected ? 'true' : 'false'}
      onClick={() => !disabled && onSelect(profile.id)}
      style={{ pointerEvents: disabled ? 'none' : 'auto' }}
    >
      <div className="profile-thumbnail">
        {profile.thumbnail && !imgError ? (
          <img
            src={profile.thumbnail}
            alt={`Foto de ${profile.name}`}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold text-2xl bg-slate-100 dark:bg-slate-800">
            {getInitials(profile.name)}
          </div>
        )}
      </div>
      
      <div className="profile-info">
        <p className="profile-name group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{profile.name}</p>
        {profile.isAdmin && (
          <span className="tag mt-2 bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-transparent">
            Admin
          </span>
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
    </div>
  );
};
