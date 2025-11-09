const { ipcMain } = require('electron');
const automation = require('../automation');
const { getProfiles, findProfileById } = require('../profiles');
const { formatProfileForRenderer } = require('../utils/profile-formatter');

function registerAutomationHandlers() {
  ipcMain.handle('automation:profiles', async () => {
    return getProfiles().map(formatProfileForRenderer);
  });

  ipcMain.handle('automation:start', async (_event, profileId) => {
    const profile = findProfileById(profileId);
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
