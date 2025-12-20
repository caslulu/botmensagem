const { ipcMain } = require('electron');
const automation = require('../automation');
const profilesService = require('../domains/profiles/profiles-service');

function registerAutomationHandlers() {
  ipcMain.handle('automation:profiles', async () => {
    const profiles = profilesService.list();
    console.log('[IPC] automation:profiles returning:', profiles.length, 'profiles');
    profiles.forEach(p => console.log(`  - ${p.name} (${p.id}) admin=${p.isAdmin} thumb=${!!p.thumbnail}`));
    return profiles;
  });

  ipcMain.handle('automation:start', async (_event, profileId) => {
    const profile = profilesService.get(profileId);
    if (!profile) {
      throw new Error(`Perfil desconhecido: ${profileId}`);
    }

    if (!profile.isAdmin) {
      throw new Error('Somente contas administradoras podem enviar mensagens automáticas.');
    }

    return automation.start(profile);
  });

  ipcMain.handle('automation:stop', async () => {
    return automation.stop();
  });
}

module.exports = { registerAutomationHandlers };
