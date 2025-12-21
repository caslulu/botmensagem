import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Profile } from '../../components/profile/ProfileCard';

type CreateProfileInput = {
  id: string;
  name: string;
  isAdmin?: boolean;
  imagePath?: string;
};

type UpdateProfileInput = {
  name: string;
  imagePath?: string;
};

interface ProfileContextValue {
  profiles: Profile[];
  selectedProfileId: string | null;
  setSelectedProfileId: (id: string | null) => void;
  reloadProfiles: () => Promise<void>;
  createProfile: (input: CreateProfileInput) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (id: string, updates: UpdateProfileInput) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
  error?: string;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

async function fetchProfiles(): Promise<Profile[]> {
  if (window.profile?.getProfiles) {
    try {
      const result = await window.profile.getProfiles();
      console.log('[ProfileProvider] Raw IPC result:', result);
      console.log('[ProfileProvider] Is array?', Array.isArray(result));
      return Array.isArray(result) ? result : [];
    } catch (err) {
      console.error('[ProfileProvider] Error fetching profiles:', err);
      return [];
    }
  }
  console.warn('[ProfileProvider] window.profile.getProfiles not available');
  return [];
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const reloadProfiles = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const list = await fetchProfiles();
      setProfiles(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar perfis');
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProfile = useCallback(async (input: CreateProfileInput) => {
    if (!window.profile?.create) {
      return { success: false, error: 'API de perfil não disponível' };
    }
    try {
      const result = await window.profile.create(input);
      if (!result?.success) {
        return { success: false, error: result?.error || 'Não foi possível criar o perfil.' };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Falha ao criar perfil.' };
    }
  }, []);

  const updateProfile = useCallback(async (id: string, updates: UpdateProfileInput) => {
    if (!window.profile?.update) {
      return { success: false, error: 'API de perfil não disponível' };
    }
    try {
      const result = await window.profile.update(id, updates);
      if (!result?.success) {
        return { success: false, error: result?.error || 'Falha ao atualizar perfil.' };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Falha ao atualizar perfil.' };
    }
  }, []);

  useEffect(() => {
    reloadProfiles();
  }, [reloadProfiles]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profiles,
      selectedProfileId,
      setSelectedProfileId,
      reloadProfiles,
      createProfile,
      updateProfile,
      loading,
      error
    }),
    [profiles, selectedProfileId, reloadProfiles, createProfile, updateProfile, loading, error]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfileContext() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfileContext must be used within ProfileProvider');
  }
  return ctx;
}
