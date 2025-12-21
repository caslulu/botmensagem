import { useCallback, useRef, useState } from 'react';
import type { Profile } from '../../components/profile/ProfileCard';
import type { ServiceModule } from '../../components/layout/ServiceNav';

const DEFAULT_PASSWORD = '1029';

type UseAdminGateParams = {
  modules: ServiceModule[];
  selectedProfile: Profile | null;
  setSelectedProfileId: (id: string | null) => void;
  defaultModuleId?: string;
};

export function useAdminGate({
  modules,
  selectedProfile,
  setSelectedProfileId,
  defaultModuleId = 'mensagens'
}: UseAdminGateParams) {
  const [activeModuleId, setActiveModuleId] = useState<string>(defaultModuleId);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminModalLoading, setAdminModalLoading] = useState(false);
  const [adminModalError, setAdminModalError] = useState<string | undefined>(undefined);
  const [tempAdminAccess, setTempAdminAccess] = useState<string | null>(null);

  const pendingModuleId = useRef<string | null>(null);
  const pendingProfileId = useRef<string | null>(null);

  const resetAccess = useCallback(() => {
    pendingModuleId.current = null;
    pendingProfileId.current = null;
    setTempAdminAccess(null);
    setActiveModuleId(defaultModuleId);
    setSelectedProfileId(null);
    setShowAdminModal(false);
    setAdminModalError(undefined);
  }, [defaultModuleId, setSelectedProfileId]);

  const requestProfileSelection = useCallback(
    (profile: Profile) => {
      if (profile.isAdmin) {
        pendingProfileId.current = profile.id;
        setShowAdminModal(true);
        setAdminModalError(undefined);
      } else {
        setSelectedProfileId(profile.id);
      }
    },
    [setSelectedProfileId]
  );

  const selectModule = useCallback(
    (id: string) => {
      const mod = modules.find((m) => m.id === id);
      const requiresAdmin = Boolean(mod?.requiresAdmin);
      const hasAccess = Boolean(selectedProfile?.isAdmin || (tempAdminAccess && tempAdminAccess === id));

      if (requiresAdmin && !hasAccess) {
        pendingModuleId.current = id;
        setShowAdminModal(true);
        setAdminModalError(undefined);
        return;
      }
      setActiveModuleId(id);
    },
    [modules, selectedProfile, tempAdminAccess]
  );

  const submitAdminPassword = useCallback(
    async (password: string) => {
      setAdminModalLoading(true);
      setAdminModalError(undefined);
      try {
        if (password !== DEFAULT_PASSWORD) throw new Error('Senha incorreta.');

        if (pendingProfileId.current) {
          setSelectedProfileId(pendingProfileId.current);
          pendingProfileId.current = null;
          setShowAdminModal(false);
          return;
        }

        if (pendingModuleId.current) {
          const targetId = pendingModuleId.current;
          setTempAdminAccess(targetId);
          setActiveModuleId(targetId);
          pendingModuleId.current = null;
          setShowAdminModal(false);
        }
      } catch (e: any) {
        setAdminModalError(e?.message || 'Erro ao validar senha.');
      } finally {
        setAdminModalLoading(false);
      }
    },
    [setSelectedProfileId]
  );

  const closeAdminModal = useCallback(() => {
    setShowAdminModal(false);
    setAdminModalError(undefined);
    pendingModuleId.current = null;
    pendingProfileId.current = null;
  }, []);

  return {
    activeModuleId,
    tempAdminAccess,
    selectModule,
    requestProfileSelection,
    resetAccess,
    adminModal: {
      open: showAdminModal,
      loading: adminModalLoading,
      error: adminModalError,
      submit: submitAdminPassword,
      close: closeAdminModal
    }
  };
}
