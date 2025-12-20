import { contextBridge, ipcRenderer } from 'electron';
import { registerAutomationBridge } from './bridges/automation';
import { registerMessagesBridge } from './bridges/messages';
import { registerFileSystemBridge } from './bridges/file-system';
import { registerProfileBridge } from './bridges/profile';
import { registerServicesBridge } from './bridges/services';
import { registerRtaBridge } from './bridges/rta';
import { registerTrelloBridge } from './bridges/trello';
import { registerPriceBridge } from './bridges/price';
import { registerQuotesBridge } from './bridges/quotes';
import { registerFilesBridge } from './bridges/files';

type BridgeRegistrar = (deps: {
  contextBridge: typeof contextBridge;
  ipcRenderer: typeof ipcRenderer;
}) => void;

const bridges: BridgeRegistrar[] = [
  registerAutomationBridge,
  registerMessagesBridge,
  registerFileSystemBridge,
  registerProfileBridge,
  registerServicesBridge,
  registerRtaBridge,
  registerTrelloBridge,
  registerPriceBridge,
  registerQuotesBridge,
  registerFilesBridge
];

bridges.forEach((registerBridge) => {
  registerBridge({ contextBridge, ipcRenderer });
});
