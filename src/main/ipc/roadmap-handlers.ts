import { ipcMain } from 'electron';
import { createError, createSuccess } from '../utils/result';
import { createRoadmapItem, listRoadmapItems, updateRoadmapItem, updateRoadmapStatus, deleteRoadmapItem } from '../database';

export function registerRoadmapHandlers(): void {
  ipcMain.handle('roadmap:list', async () => {
    try {
      const items = listRoadmapItems();
      return createSuccess({ items });
    } catch (error) {
      console.error('[IPC][roadmap:list]', error);
      return createError(error);
    }
  });

  ipcMain.handle('roadmap:create', async (_event, payload) => {
    try {
      const item = createRoadmapItem(payload || {});
      return createSuccess({ item });
    } catch (error) {
      console.error('[IPC][roadmap:create]', error);
      return createError(error);
    }
  });

  ipcMain.handle('roadmap:update-status', async (_event, payload) => {
    try {
      const { id, status } = payload || {};
      const item = updateRoadmapStatus(id, status);
      if (!item) return createError('Item não encontrado');
      return createSuccess({ item });
    } catch (error) {
      console.error('[IPC][roadmap:update-status]', error);
      return createError(error);
    }
  });

  ipcMain.handle('roadmap:update', async (_event, payload) => {
    try {
      const { id, ...rest } = payload || {};
      const item = updateRoadmapItem(id, rest);
      if (!item) return createError('Item não encontrado');
      return createSuccess({ item });
    } catch (error) {
      console.error('[IPC][roadmap:update]', error);
      return createError(error);
    }
  });

  ipcMain.handle('roadmap:delete', async (_event, payload) => {
    try {
      const { id } = payload || {};
      const ok = deleteRoadmapItem(id);
      if (!ok) return createError('Item não encontrado');
      return createSuccess({ deleted: true });
    } catch (error) {
      console.error('[IPC][roadmap:delete]', error);
      return createError(error);
    }
  });
}
