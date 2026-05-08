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

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
};

type DesktopSession = {
  authenticated?: boolean;
  expiresAt: string;
  user: AuthUser;
  profile?: Profile;
};

interface ProfileContextValue {
  profiles: Profile[];
  selectedProfileId: string | null;
  setSelectedProfileId: (id: string | null) => void;
  reloadProfiles: () => Promise<void>;
  login: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  authUser: AuthUser | null;
  checkingSession: boolean;
  createProfile: (input: CreateProfileInput) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (id: string, updates: UpdateProfileInput) => Promise<{ success: boolean; error?: string }>;
  deleteProfile: (id: string) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
  error?: string;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

async function fetchProfiles(): Promise<Profile[]> {
  if (window.desktopAuth?.getSession) {
    try {
      const result = await window.desktopAuth.getSession();
      const session = result.success ? result.session : null;
      const profile = session?.profile;
      if (session?.authenticated !== false && profile?.id) {
        return [profile];
      }
      return [];
    } catch (err) {
      console.error('[ProfileProvider] Error fetching web session:', err);
      return [];
    }
  }

  if (window.profile?.getProfiles) {
    try {
      const result = await window.profile.getProfiles();
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
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [checkingSession, setCheckingSession] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const reloadProfiles = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const list = await fetchProfiles();
      setProfiles(list);
      if (list.length === 1) {
        setSelectedProfileId(list[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar perfis');
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const applySession = useCallback((session: Partial<DesktopSession> | null | undefined) => {
    const profile = session?.profile;
    if (!session?.user || !profile?.id) {
      setAuthUser(null);
      setProfiles([]);
      setSelectedProfileId(null);
      return;
    }

    setAuthUser(session.user);
    setProfiles([profile]);
    setSelectedProfileId(profile.id);
  }, []);

  const login = useCallback(
    async (credentials: { email: string; password: string }) => {
      if (!window.desktopAuth?.login) {
        return { success: false, error: 'API de login web não disponível' };
      }

      try {
        const result = await window.desktopAuth.login(credentials);
        if (!result?.success) {
          return { success: false, error: result?.error || 'Não foi possível entrar.' };
        }
        applySession(result.success ? result.session : null);
        return { success: true };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Falha ao entrar.' };
      }
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      await window.desktopAuth?.logout?.();
    } finally {
      applySession(null);
    }
  }, [applySession]);

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

  const deleteProfile = useCallback(async (id: string) => {
    if (!window.profile?.delete) {
      return { success: false, error: 'API de perfil não disponível' };
    }
    try {
      const result = await window.profile.delete(id);
      if (!result?.success) {
        return { success: false, error: result?.error || 'Falha ao deletar perfil.' };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Falha ao deletar perfil.' };
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      setCheckingSession(true);
      setError(undefined);
      try {
        const result = await window.desktopAuth?.getSession?.();
        if (!active) return;
        if (result?.success && result.session?.authenticated !== false) {
          applySession(result.success ? result.session : null);
        } else {
          applySession(null);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Falha ao validar sessão web');
        applySession(null);
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, [applySession]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profiles,
      selectedProfileId,
      setSelectedProfileId,
      reloadProfiles,
      login,
      logout,
      authUser,
      checkingSession,
      createProfile,
      updateProfile,
      deleteProfile,
      loading,
      error
    }),
    [profiles, selectedProfileId, reloadProfiles, login, logout, authUser, checkingSession, createProfile, updateProfile, deleteProfile, loading, error]
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
