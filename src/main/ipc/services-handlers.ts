import { ipcMain } from 'electron';
import { listServices } from '../services/service-registry';

export function registerServiceHandlers(): void {
  ipcMain.handle('services:list', async () => listServices());
}
