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
      className={`profile-card border rounded-xl p-4 flex items-center gap-4 cursor-pointer transition ring-2 ring-transparent ${
        selected ? 'ring-brand-500' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      data-profile-id={profile.id}
      data-active={selected ? 'true' : 'false'}
      onClick={() => !disabled && onSelect(profile.id)}
      style={{ pointerEvents: disabled ? 'none' : 'auto' }}
    >
      {profile.thumbnail && !imgError ? (
        <img
          src={profile.thumbnail}
          alt={`Foto de ${profile.name}`}
          className="w-12 h-12 rounded-full object-cover bg-slate-800"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-semibold text-sm border border-slate-700">
          {getInitials(profile.name)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate">{profile.name}</p>
        {profile.isAdmin && (
          <span className="text-xs text-emerald-400 ml-1">Admin</span>
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
