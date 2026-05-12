import type { BrowserWindow } from 'electron';
import { registerAutomationHandlers } from './automation-handlers';
import { registerMessageHandlers } from './message-handlers';
import { registerProfileHandlers } from './profile-handlers';
import { registerFileHandlers } from './file-handlers';
import { registerServiceHandlers } from './services-handlers';
import { registerPriceHandlers } from './price-handlers';
import { registerRtaHandlers } from './rta-handlers';
import { registerQuoteHandlers } from './quotes-handlers';
import { registerRoadmapHandlers } from './roadmap-handlers';
import { registerAppHandlers } from './app-handlers';
import { registerAuthHandlers } from './auth-handlers';
import { registerWebApiHandlers } from './web-api-handlers';

export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null): void {
  registerAppHandlers(getMainWindow);
  registerAuthHandlers();
  registerWebApiHandlers();
  registerAutomationHandlers();
  registerMessageHandlers();
  registerProfileHandlers();
  registerServiceHandlers();
  registerPriceHandlers();
  registerRtaHandlers();
  registerQuoteHandlers();
  registerRoadmapHandlers();
  registerFileHandlers(getMainWindow);
}
