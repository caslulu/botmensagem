import type { BrowserWindow } from 'electron';
import { registerAutomationHandlers } from './automation-handlers';
import { registerMessageHandlers } from './message-handlers';
import { registerProfileHandlers } from './profile-handlers';
import { registerFileHandlers } from './file-handlers';
import { registerServiceHandlers } from './services-handlers';
import { registerPriceHandlers } from './price-handlers';
import { registerRtaHandlers } from './rta-handlers';
import { registerTrelloHandlers } from './trello-handlers';
import { registerQuoteHandlers } from './quotes-handlers';
import { registerRoadmapHandlers } from './roadmap-handlers';

export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null): void {
  registerAutomationHandlers();
  registerMessageHandlers();
  registerProfileHandlers();
  registerServiceHandlers();
  registerPriceHandlers();
  registerRtaHandlers();
  registerTrelloHandlers();
  registerQuoteHandlers();
  registerRoadmapHandlers();
  registerFileHandlers(getMainWindow);
}
