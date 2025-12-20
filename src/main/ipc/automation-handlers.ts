import { ipcMain } from 'electron';
import automation from '../automation';
import * as profilesService from '../domains/profiles/profiles-service';

export function registerAutomationHandlers(): void {
  ipcMain.handle('automation:profiles', async () => {
    const profiles = ((profilesService.list() || []) as Array<any>).filter(Boolean);
    console.log('[IPC] automation:profiles returning:', profiles.length, 'profiles');
    profiles.forEach((profile) =>
      console.log(`  - ${profile.name} (${profile.id}) admin=${profile.isAdmin} thumb=${Boolean(profile.thumbnail)}`)
    );
    return profiles;
  });

  ipcMain.handle('automation:start', async (_event, profileId: string) => {
    const profile = profilesService.get(profileId);
    if (!profile) {
      throw new Error(`Perfil desconhecido: ${profileId}`);
    }

    if (!profile.isAdmin) {
      throw new Error('Somente contas administradoras podem enviar mensagens automáticas.');
    }

    return automation.start(profile);
  });

  ipcMain.handle('automation:stop', async () => automation.stop());
}
