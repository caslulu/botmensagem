import React, { useState } from 'react';
import { WhatsAppAutomationView, ConfigView, DesktopKanbanView, RtaView, PriceView } from './pages';
import AppShell from './components/layout/AppShell';
import type { ServiceModule } from './components/layout/ServiceNav';
import { AdminPasswordModal } from './components/profile/AdminPasswordModal';
import { DesktopLogin } from './components/auth/DesktopLogin';
import { DEFAULT_MODULES } from './app/modules';
import { ThemeProvider, ProfileProvider, useTheme, useProfileContext } from './app/providers';
import { useAdminGate } from './app/hooks/useAdminGate';

function AppContent() {
  const {
    profiles,
    selectedProfileId,
    setSelectedProfileId,
    login,
    logout,
    checkingSession,
    loading,
    error
  } = useProfileContext();
  const [modules] = useState<ServiceModule[]>(DEFAULT_MODULES);
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) || null;
  const { isDarkMode, toggleTheme } = useTheme();

  const {
    activeModuleId,
    tempAdminAccess,
    selectModule,
    resetAccess,
    adminModal
  } = useAdminGate({ modules, selectedProfile, setSelectedProfileId });

  const selectedProfileHasAccess = !!selectedProfile?.isAdmin || (tempAdminAccess !== null && tempAdminAccess === activeModuleId);

  const handleResetProfile = async () => {
    await logout();
    resetAccess();
  };

  const handleSelectModule = (id: string) => {
    selectModule(id);
  };

  const handleAdminPassword = async (password: string) => {
    await adminModal.submit(password);
  };

  const mainContent = checkingSession ? (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="surface-subtle max-w-md">
        <p className="text-sm font-semibold text-slate-800 dark:text-white">Validando sessão...</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Conferindo seu login na API cloud.
        </p>
      </div>
    </div>
  ) : selectedProfile ? (
    <AppShell
      modules={modules}
      activeModuleId={activeModuleId}
      onSelectModule={handleSelectModule}
      selectedProfileIsAdmin={selectedProfileHasAccess}
      selectedProfile={selectedProfile}
      isDarkMode={isDarkMode}
      onToggleTheme={toggleTheme}
      onResetProfile={() => void handleResetProfile()}
    >
      {activeModuleId === 'mensagens' && (
        <WhatsAppAutomationView
          profileId={selectedProfile.id}
          profileName={selectedProfile.name}
          isAdmin={selectedProfileHasAccess}
        />
      )}
      {activeModuleId === 'kanban' && <DesktopKanbanView />}
      {activeModuleId === 'rta' && <RtaView />}
      {activeModuleId === 'preco' && <PriceView />}
      {activeModuleId === 'config' && <ConfigView />}
    </AppShell>
  ) : (
    <DesktopLogin
      onLogin={login}
      loading={loading}
      error={error}
      isDarkMode={isDarkMode}
      onToggleTheme={toggleTheme}
    />
  );

  return (
    <>
      {mainContent}
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
