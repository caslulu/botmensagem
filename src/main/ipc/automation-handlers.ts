import { ipcMain } from 'electron';
import automation from '../automation';
import * as webAuth from '../domains/auth/web-auth-service';
import messagesService from '../domains/messages/messages-service';

export function registerAutomationHandlers(): void {
  ipcMain.handle('automation:profiles', async () => {
    const session = await webAuth.getSession();
    if (!session?.authenticated || !session?.profile) {
      return [];
    }
    return [session.profile];
  });

  ipcMain.handle('automation:start', async (_event, profileId: string) => {
    const session = await webAuth.getSession();
    if (!session?.authenticated || !session?.user) {
      throw new Error('Sessão inválida. Faça login novamente.');
    }

    if (String(profileId || '').trim() !== session.user.id) {
      throw new Error('Perfil inválido para o usuário autenticado.');
    }

    if (session.user.role !== 'admin') {
      throw new Error('Somente contas administradoras podem enviar mensagens automáticas.');
    }

    const selectedMessage = await messagesService.getSelected(session.user.id);
    if (!selectedMessage?.text?.trim()) {
      throw new Error('Nenhuma mensagem ativa encontrada para este usuário.');
    }

    return automation.start({
      id: session.user.id,
      name: session.user.name,
      isAdmin: true,
      thumbnail: session.user.avatarUrl || null,
      message: selectedMessage.text,
      imagePath: selectedMessage.imagePath || null
    });
  });

  ipcMain.handle('automation:stop', async () => automation.stop());
}
