import { WhatsAppAutomationView, RtaView, TrelloView, QuotesView, PriceView, HowToView } from './components/views/ModuleViews'

import React, { useState, useRef } from 'react'
import AppShell from './components/layout/AppShell'
import type { ServiceModule } from './components/layout/ServiceNav'
import { ProfileSelection } from './components/profile/ProfileSelection'
import { ProfileModal } from './components/profile/ProfileModal'
import { ProfileEditModal } from './components/profile/ProfileEditModal'
import { AdminPasswordModal } from './components/profile/AdminPasswordModal'
import type { Profile } from './components/profile/ProfileCard'



declare global {
  interface Window {
    profile?: any;
  }
}

function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [modules, setModules] = useState<ServiceModule[]>([{
    id: 'mensagens', name: 'Enviar mensagem automática', icon: '💬', requiresAdmin: true
  }, {
    id: 'rta', name: 'RTA automático', icon: '📄'
  }, {
    id: 'trello', name: 'Integração Trello', icon: '📋'
  }, {
    id: 'cotacoes', name: 'Cotações', icon: '📑'
  }, {
    id: 'price', name: 'Preço automático', icon: '💵'
  }, {
    id: 'howto', name: 'Como usar', icon: '❔'
  }]);
  const [activeModuleId, setActiveModuleId] = useState<string>('mensagens');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalError, setProfileModalError] = useState<string | undefined>(undefined);
  const [profileModalLoading, setProfileModalLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalError, setEditModalError] = useState<string | undefined>(undefined);
  const [editModalLoading, setEditModalLoading] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminModalLoading, setAdminModalLoading] = useState(false);
  const [adminModalError, setAdminModalError] = useState<string | undefined>(undefined);
  const pendingModuleId = useRef<string | null>(null);
  const pendingProfileId = useRef<string | null>(null);
  const [tempAdminAccess, setTempAdminAccess] = useState<string | null>(null);
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) || null;
  const [isDarkMode, setIsDarkMode] = useState(true);

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Load profiles from Electron preload API
  React.useEffect(() => {
    async function fetchProfiles() {
      if (window.profile?.getProfiles) {
        try {
          const result = await window.profile.getProfiles();
          setProfiles(Array.isArray(result) ? result : []);
        } catch (e) {
          setProfiles([]);
        }
      }
    }
    fetchProfiles();
  }, []);

  const handleEditProfile = () => {
    if (!selectedProfile) return;
    setShowEditModal(true);
    setEditModalError(undefined);
  };
  const handleEditModalClose = () => {
    setShowEditModal(false);
    setEditModalError(undefined);
  };
  const handleEditModalSave = async (updates: { name: string; imagePath?: string }) => {
    setEditModalLoading(true);
    setEditModalError(undefined);
    try {
      if (!selectedProfile) throw new Error('Nenhum perfil selecionado');
      if (!window.profile?.update) throw new Error('API de perfil não disponível');
      const result = await window.profile.update(selectedProfile.id, {
        name: updates.name,
        imagePath: updates.imagePath || ''
      });
      if (!result?.success) {
        setEditModalError(result?.error || 'Falha ao atualizar perfil.');
        setEditModalLoading(false);
        return;
      }
      // Reload profiles
      if (window.profile?.getProfiles) {
        const list = await window.profile.getProfiles();
        setProfiles(Array.isArray(list) ? list : []);
      }
      setShowEditModal(false);
    } catch (e) {
      const message = (e && typeof e === 'object' && 'message' in e)
        ? (e as { message: string }).message
        : 'Erro ao atualizar perfil.'
      setEditModalError(message);
    } finally {
      setEditModalLoading(false);
    }
  };

  const handleAddProfile = () => setShowProfileModal(true);
  const handleProfileModalClose = () => {
    setShowProfileModal(false);
    setProfileModalError(undefined);
  };
  const handleProfileModalSave = async (profile: Omit<Profile, 'thumbnail'> & { imagePath?: string }) => {
    setProfileModalLoading(true);
    setProfileModalError(undefined);
    try {
      if (!window.profile?.create) throw new Error('API de perfil não disponível');
      const payload: any = {
        id: profile.id,
        name: profile.name,
        isAdmin: profile.isAdmin,
        imagePath: profile.imagePath || ''
      };
      const response = await window.profile.create(payload);
      if (!response?.success) {
        setProfileModalError(response?.error || 'Não foi possível criar o perfil.');
        setProfileModalLoading(false);
        return;
      }
      // Reload profiles
      if (window.profile?.getProfiles) {
        const result = await window.profile.getProfiles();
        setProfiles(Array.isArray(result) ? result : []);
      }
      setShowProfileModal(false);
    } catch (e) {
      const message = (e && typeof e === 'object' && 'message' in e)
        ? (e as { message: string }).message
        : 'Erro ao criar perfil.'
      setProfileModalError(message);
    } finally {
      setProfileModalLoading(false);
    }
  };

  const handleSelectProfile = (id: string) => {
    const profile = profiles.find(p => p.id === id);
    if (profile?.isAdmin) {
        pendingProfileId.current = id;
        setShowAdminModal(true);
        setAdminModalError(undefined);
    } else {
        setSelectedProfileId(id);
    }
  };

  const handleResetProfile = () => {
    pendingModuleId.current = null;
    setTempAdminAccess(null);
    setActiveModuleId('mensagens');
    setSelectedProfileId(null);
  };

  // Handler para navegação de módulo com proteção admin
  const handleSelectModule = (id: string) => {
    const mod = modules.find((m) => m.id === id);
    if (mod?.requiresAdmin && !selectedProfile?.isAdmin && tempAdminAccess !== id) {
      pendingModuleId.current = id;
      setShowAdminModal(true);
      setAdminModalError(undefined);
      return;
    }
    setActiveModuleId(id);
  };

  // Handler de validação de senha admin
  const handleAdminPassword = async (password: string) => {
    setAdminModalLoading(true);
    setAdminModalError(undefined);
    try {
      // Senha hardcoded temporária (ajustar para produção)
      if (password !== '1029') throw new Error('Senha incorreta.');
      
      if (pendingProfileId.current) {
          setSelectedProfileId(pendingProfileId.current);
          pendingProfileId.current = null;
          setShowAdminModal(false);
      } else if (pendingModuleId.current) {
        setTempAdminAccess(pendingModuleId.current);
        setActiveModuleId(pendingModuleId.current);
        pendingModuleId.current = null;
        setShowAdminModal(false);
      }
    } catch (e: any) {
      setAdminModalError(e?.message || 'Erro ao validar senha.');
    } finally {
      setAdminModalLoading(false);
    }
  };

  const mainContent = selectedProfile ? (
    <AppShell
      modules={modules}
      activeModuleId={activeModuleId}
      onSelectModule={handleSelectModule}
      selectedProfileIsAdmin={!!selectedProfile?.isAdmin || (tempAdminAccess !== null && tempAdminAccess === activeModuleId)}
    >
      <div className="container mx-auto py-8 px-6">
        <header className="flex items-center justify-between mb-8 bg-white/50 dark:bg-slate-800/50 p-6 rounded-2xl backdrop-blur-sm border border-white/20 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              Insurance Helper
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Bem-vindo, <span className="font-semibold text-brand-600 dark:text-brand-400">{selectedProfile?.name}</span>
            </p>
          </div>
          
          <div className="flex gap-3">
            <button 
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-slate-600 transition-all shadow-sm border border-slate-200 dark:border-slate-600"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            
            <div className="h-10 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

            <button 
              className="btn-secondary flex items-center gap-2" 
              onClick={handleResetProfile}
            >
              <span>↶</span> Trocar perfil
            </button>
            <button
              className="btn-primary flex items-center gap-2"
              onClick={handleEditProfile}
              disabled={!selectedProfile}
            >
              <span>✎</span> Editar perfil
            </button>
          </div>
        </header>

        <main className="animate-fade-in">
          {activeModuleId === 'mensagens' && (
            <WhatsAppAutomationView
              profileId={selectedProfile?.id || null}
              profileName={selectedProfile?.name || null}
              isAdmin={!!selectedProfile?.isAdmin || (tempAdminAccess !== null && tempAdminAccess === activeModuleId)}
            />
          )}
          {activeModuleId === 'rta' && <RtaView />}
          {activeModuleId === 'trello' && <TrelloView />}
          {activeModuleId === 'cotacoes' && <QuotesView />}
          {activeModuleId === 'price' && <PriceView />}
          {activeModuleId === 'howto' && <HowToView />}
        </main>
      </div>
    </AppShell>
  ) : (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 py-12 transition-colors duration-300 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-brand-500/5 blur-[120px]"></div>
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[100px]"></div>
      </div>

      <div className="w-full max-w-5xl px-6 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 dark:text-white tracking-tight">
              Insurance Helper
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 mt-2">
              Selecione seu perfil para acessar o sistema.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-slate-700 transition-all shadow-sm border border-slate-200 dark:border-slate-700"
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button className="btn-primary flex items-center gap-2 shadow-lg shadow-brand-500/20" onClick={handleAddProfile}>
              <span className="text-lg">✚</span> Novo perfil
            </button>
          </div>
        </div>
        
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-xl">
          <ProfileSelection
            profiles={profiles}
            selectedProfileId={selectedProfileId}
            onSelect={handleSelectProfile}
            onAddProfile={handleAddProfile}
            selectionEnabled={true}
          />
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
      <ProfileEditModal
        open={showEditModal}
        profile={selectedProfile}
        onClose={handleEditModalClose}
        onSave={handleEditModalSave}
        loading={editModalLoading}
        error={editModalError}
      />
      <AdminPasswordModal
        open={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onSubmit={handleAdminPassword}
        loading={adminModalLoading}
        error={adminModalError}
      />
    </>
  );
}

export default App
