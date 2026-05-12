import type { BrowserWindow } from 'electron';
import { registerAutomationHandlers } from './automation-handlers';
import { registerMessageHandlers } from './message-handlers';
import { registerFileHandlers } from './file-handlers';
import { registerServiceHandlers } from './services-handlers';
import { registerPriceHandlers } from './price-handlers';
import { registerRtaHandlers } from './rta-handlers';
import { registerAppHandlers } from './app-handlers';
import { registerAuthHandlers } from './auth-handlers';
import { registerWebApiHandlers } from './web-api-handlers';

export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null): void {
  registerAppHandlers(getMainWindow);
  registerAuthHandlers();
  registerWebApiHandlers();
  registerAutomationHandlers();
  registerMessageHandlers();
  registerServiceHandlers();
  registerPriceHandlers();
  registerRtaHandlers();
  registerFileHandlers(getMainWindow);
}
