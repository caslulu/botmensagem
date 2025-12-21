import type { BrowserWindow, WebContents } from 'electron';

type AutomationEmitter = {
  on(event: 'log', listener: (message: string) => void): void;
  on(event: 'status', listener: (payload: Record<string, unknown>) => void): void;
};

export function forwardAutomationEvents(
  automation: AutomationEmitter,
  getMainWindow: () => BrowserWindow | null
): void {
  if (!automation || typeof automation.on !== 'function') {
    throw new Error('Instância de automação inválida para forwarding de eventos.');
  }

  automation.on('log', (message) => {
    const window = getMainWindow();
    const webContents: WebContents | undefined = window?.isDestroyed() ? undefined : window?.webContents;
    if (webContents) {
      webContents.send('automation:log', message);
    }
  });

  automation.on('status', (payload) => {
    const window = getMainWindow();
    const webContents: WebContents | undefined = window?.isDestroyed() ? undefined : window?.webContents;
    if (webContents) {
      webContents.send('automation:status', payload);
    }
  });
}
