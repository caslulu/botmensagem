function forwardAutomationEvents(automation, getMainWindow) {
  if (!automation || typeof automation.on !== 'function') {
    throw new Error('Instância de automação inválida para forwarding de eventos.');
  }

  automation.on('log', (message) => {
    const window = getMainWindow();
    if (window && !window.isDestroyed()) {
      window.webContents.send('automation:log', message);
    }
  });

  automation.on('status', (payload) => {
    const window = getMainWindow();
    if (window && !window.isDestroyed()) {
      window.webContents.send('automation:status', payload);
    }
  });
}

module.exports = { forwardAutomationEvents };
