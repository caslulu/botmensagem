const { contextBridge, ipcRenderer } = require('electron');

const { registerAutomationBridge } = require('./bridges/automation');
const { registerMessagesBridge } = require('./bridges/messages');
const { registerFileSystemBridge } = require('./bridges/file-system');
const { registerProfileBridge } = require('./bridges/profile');
const { registerServicesBridge } = require('./bridges/services');
const { registerRtaBridge } = require('./bridges/rta');
const { registerTrelloBridge } = require('./bridges/trello');
const { registerPriceBridge } = require('./bridges/price');
const { registerQuotesBridge } = require('./bridges/quotes');
const { registerFilesBridge } = require('./bridges/files');

const bridges = [
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
