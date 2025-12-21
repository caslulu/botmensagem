import { ipcMain } from 'electron';
import profilesService from '../domains/profiles/profiles-service';

export function registerProfileHandlers(): void {
  ipcMain.handle('profile:create', async (_event, profileData: Record<string, unknown>) => {
    const result = profilesService.create(profileData) as any;
    if (!result?.success) {
      console.error('Erro ao criar perfil:', result?.error);
    }
    return result;
  });

  ipcMain.handle('profile:get-settings', async (_event, profileId: string) => {
    try {
      return profilesService.getSettings(profileId);
    } catch (error) {
      console.error('Erro ao buscar configurações do perfil:', error);
      throw error;
    }
  });

  ipcMain.handle('profile:update-send-limit', async (_event, profileId: string, sendLimit: number) => {
    try {
      return profilesService.updateSendLimit(profileId, sendLimit);
    } catch (error) {
      console.error('Erro ao atualizar limite de envios:', error);
      throw error;
    }
  });

  ipcMain.handle('profile:update', async (_event, profileId: string, updates: Record<string, unknown>) => {
    const result = profilesService.update(profileId, updates) as any;
    if (!result?.success) {
      console.error('Erro ao atualizar perfil:', result?.error);
    }
    return result;
  });
}
