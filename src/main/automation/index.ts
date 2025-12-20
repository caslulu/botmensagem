import automationController from './automation-controller';
import BrowserManager from './browser-manager';
import WhatsAppService from './whatsapp-service';
import MessageSender from './message-sender';
import ChatProcessor from './chat-processor';
import ProfileValidator from './profile-validator';
import Logger from './utils/logger';
import PathResolver from './utils/path-resolver';
import ChromeDetector from './utils/chrome-detector';
import { config } from './config';

export default automationController;
export {
  BrowserManager,
  WhatsAppService,
  MessageSender,
  ChatProcessor,
  ProfileValidator,
  Logger,
  PathResolver,
  ChromeDetector,
  config
};
