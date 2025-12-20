const { ipcMain } = require('electron');
const profilesService = require('../domains/profiles/profiles-service');

function registerProfileHandlers() {
  ipcMain.handle('profile:create', async (_event, profileData) => {
    const result = profilesService.create(profileData);
    if (!result?.success) {
      console.error('Erro ao criar perfil:', result?.error);
    }
    return result;
  });

  ipcMain.handle('profile:get-settings', async (_event, profileId) => {
    try {
      return profilesService.getSettings(profileId);
    } catch (error) {
      console.error('Erro ao buscar configurações do perfil:', error);
      throw error;
    }
  });

  ipcMain.handle('profile:update-send-limit', async (_event, profileId, sendLimit) => {
    try {
      return profilesService.updateSendLimit(profileId, sendLimit);
    } catch (error) {
      console.error('Erro ao atualizar limite de envios:', error);
      throw error;
    }
  });

  ipcMain.handle('profile:update', async (_event, profileId, updates) => {
    const result = profilesService.update(profileId, updates);
    if (!result?.success) {
      console.error('Erro ao atualizar perfil:', result?.error);
    }
    return result;
  });
}

module.exports = { registerProfileHandlers };
