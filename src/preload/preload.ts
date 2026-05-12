import { contextBridge, ipcRenderer } from 'electron';
import { registerAutomationBridge } from './bridges/automation';
import { registerMessagesBridge } from './bridges/messages';
import { registerFileSystemBridge } from './bridges/file-system';
import { registerServicesBridge } from './bridges/services';
import { registerRtaBridge } from './bridges/rta';
import { registerPriceBridge } from './bridges/price';
import { registerFilesBridge } from './bridges/files';
import { registerAuthBridge } from './bridges/auth';
import { registerWebApiBridge } from './bridges/web-api';

type BridgeRegistrar = (deps: {
  contextBridge: typeof contextBridge;
  ipcRenderer: typeof ipcRenderer;
}) => void;

const bridges: BridgeRegistrar[] = [
  registerAutomationBridge,
  registerMessagesBridge,
  registerFileSystemBridge,
  registerServicesBridge,
  registerRtaBridge,
  registerPriceBridge,
  registerFilesBridge,
  registerAuthBridge,
  registerWebApiBridge
];

bridges.forEach((registerBridge) => {
  registerBridge({ contextBridge, ipcRenderer });
});
