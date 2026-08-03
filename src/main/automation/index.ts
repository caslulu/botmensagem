import automationController from './automation-controller';
import ProfileValidator from './profile-validator';
import Logger from './utils/logger';
import PathResolver from './utils/path-resolver';
import ChromeDetector from './utils/chrome-detector';
import { config } from './config';

export default automationController;
export {
  ProfileValidator,
  Logger,
  PathResolver,
  ChromeDetector,
  config
};
