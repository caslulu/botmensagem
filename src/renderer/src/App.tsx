import React, { useState } from 'react';
import { WhatsAppAutomationView, RtaView, QuotesView, PriceView, HowToView, NewsView, RoadmapView, ConfigView, ProfileSettingsView } from './pages';
import AppShell from './components/layout/AppShell';
import type { ServiceModule } from './components/layout/ServiceNav';
import { ProfileSelection } from './components/profile/ProfileSelection';
import { ProfileModal } from './components/profile/ProfileModal';
import { AdminPasswordModal } from './components/profile/AdminPasswordModal';
import type { Profile } from './components/profile/ProfileCard';
import { DEFAULT_MODULES } from './app/modules';
import { ThemeProvider, ProfileProvider, useTheme, useProfileContext } from './app/providers';
import { useAdminGate } from './app/hooks/useAdminGate';

declare global {
  interface Window {
    profile?: any;
  }
}

function AppContent() {
  const {
    profiles,
    selectedProfileId,
    setSelectedProfileId,
    reloadProfiles,
    createProfile,
    loading,
    error
  } = useProfileContext();
  const [modules] = useState<ServiceModule[]>(DEFAULT_MODULES);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalError, setProfileModalError] = useState<string | undefined>(undefined);
  const [profileModalLoading, setProfileModalLoading] = useState(false);
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) || null;
  const { isDarkMode, toggleTheme } = useTheme();

  const {
    activeModuleId,
    tempAdminAccess,
    selectModule,
    requestProfileSelection,
    resetAccess,
    adminModal
  } = useAdminGate({ modules, selectedProfile, setSelectedProfileId });

  const selectedProfileHasAccess = !!selectedProfile?.isAdmin || (tempAdminAccess !== null && tempAdminAccess === activeModuleId);

  const handleAddProfile = () => setShowProfileModal(true);

  const handleProfileModalClose = () => {
    setShowProfileModal(false);
    setProfileModalError(undefined);
  };

  const handleProfileModalSave = async (profile: Omit<Profile, 'thumbnail'> & { imagePath?: string }) => {
    setProfileModalLoading(true);
    setProfileModalError(undefined);
    try {
      const payload: { id: string; name: string; isAdmin?: boolean; imagePath?: string } = {
        id: profile.id,
        name: profile.name,
        isAdmin: profile.isAdmin,
        imagePath: profile.imagePath || ''
      };
      const response = await createProfile(payload);
      if (!response?.success) {
        setProfileModalError(response?.error || 'Não foi possível criar o perfil.');
        setProfileModalLoading(false);
        return;
      }
      await reloadProfiles();
      setShowProfileModal(false);
    } catch (createError) {
      const message = (createError && typeof createError === 'object' && 'message' in createError)
        ? (createError as { message: string }).message
        : 'Erro ao criar perfil.';
      setProfileModalError(message);
    } finally {
      setProfileModalLoading(false);
    }
  };

  const handleSelectProfile = (id: string) => {
    const profile = profiles.find((item) => item.id === id);
    if (profile) {
      requestProfileSelection(profile);
    }
  };

  const handleResetProfile = () => {
    resetAccess();
  };

  const handleSelectModule = (id: string) => {
    selectModule(id);
  };

  const handleAdminPassword = async (password: string) => {
    await adminModal.submit(password);
  };

  const mainContent = selectedProfile ? (
    <AppShell
      modules={modules}
      activeModuleId={activeModuleId}
      onSelectModule={handleSelectModule}
      selectedProfileIsAdmin={selectedProfileHasAccess}
      selectedProfile={selectedProfile}
      isDarkMode={isDarkMode}
      onToggleTheme={toggleTheme}
      onResetProfile={handleResetProfile}
    >
      {activeModuleId === 'mensagens' && (
        <WhatsAppAutomationView
          profileId={selectedProfile.id}
          profileName={selectedProfile.name}
          isAdmin={selectedProfileHasAccess}
        />
      )}
      {activeModuleId === 'rta' && <RtaView />}
      {activeModuleId === 'cotacoes' && <QuotesView />}
      {activeModuleId === 'price' && <PriceView />}
      {activeModuleId === 'howto' && <HowToView />}
      {activeModuleId === 'novidades' && <NewsView />}
      {activeModuleId === 'roadmap' && <RoadmapView />}
      {activeModuleId === 'perfil' && <ProfileSettingsView />}
      {activeModuleId === 'config' && <ConfigView />}
    </AppShell>
  ) : (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-[28rem] w-[28rem] rounded-full bg-brand-500/12 blur-[120px]" />
        <div className="absolute bottom-[-14%] right-[-6%] h-[24rem] w-[24rem] rounded-full bg-amber-400/10 blur-[110px]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-5xl">
          <section className="card p-5 sm:p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  Perfis
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                  Selecionar perfil
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Escolha um operador para continuar.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn-secondary px-3.5"
                  onClick={toggleTheme}
                >
                  <span className="text-base">{isDarkMode ? '☀️' : '🌙'}</span>
                  <span>{isDarkMode ? 'Modo claro' : 'Modo escuro'}</span>
                </button>
                <button className="btn-primary px-4" onClick={handleAddProfile}>
                  <span>✚</span>
                  <span>Novo perfil</span>
                </button>
              </div>
            </div>

            {error ? (
              <div className="mb-4 rounded-3xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                {error}
              </div>
            ) : null}

            {loading && profiles.length === 0 ? (
              <div className="surface-subtle">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Carregando perfis...</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Aguarde um instante enquanto o app prepara os operadores salvos.
                </p>
              </div>
            ) : (
              <ProfileSelection
                profiles={profiles}
                selectedProfileId={selectedProfileId}
                onSelect={handleSelectProfile}
                onAddProfile={handleAddProfile}
                selectionEnabled
              />
            )}

            {loading && profiles.length > 0 ? (
              <p className="mt-4 text-sm text-slate-400 dark:text-slate-500">
                Atualizando perfis...
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {mainContent}
      <ProfileModal
        open={showProfileModal}
        onClose={handleProfileModalClose}
        onSave={handleProfileModalSave}
        loading={profileModalLoading}
        error={profileModalError}
      />
      <AdminPasswordModal
        open={adminModal.open}
        onClose={adminModal.close}
        onSubmit={handleAdminPassword}
        loading={adminModal.loading}
        error={adminModal.error}
      />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ProfileProvider>
        <AppContent />
      </ProfileProvider>
    </ThemeProvider>
  );
}

export default App;
