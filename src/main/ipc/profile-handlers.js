const { ipcMain } = require('electron');
const { createProfile, updateProfile } = require('../profiles');
const { getProfileSettings, updateProfileSettings } = require('../database');
const { formatProfileForRenderer } = require('../utils/profile-formatter');
const { createSuccess, createError } = require('../utils/result');

function registerProfileHandlers() {
  ipcMain.handle('profile:create', async (_event, profileData) => {
    try {
      const createdProfile = createProfile(profileData);
      return createSuccess({ profile: formatProfileForRenderer(createdProfile) });
    } catch (error) {
      console.error('Erro ao criar perfil:', error);
      return createError(error);
    }
  });

  ipcMain.handle('profile:get-settings', async (_event, profileId) => {
    try {
      return getProfileSettings(profileId);
    } catch (error) {
      console.error('Erro ao buscar configurações do perfil:', error);
      throw error;
    }
  });

  ipcMain.handle('profile:update-send-limit', async (_event, profileId, sendLimit) => {
    try {
      const success = updateProfileSettings(profileId, sendLimit);
      return { success };
    } catch (error) {
      console.error('Erro ao atualizar limite de envios:', error);
      throw error;
    }
  });

  ipcMain.handle('profile:update', async (_event, profileId, updates) => {
    try {
      const profile = updateProfile(profileId, updates);
      return createSuccess({ profile: formatProfileForRenderer(profile) });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      return createError(error);
    }
  });
}

module.exports = { registerProfileHandlers };
