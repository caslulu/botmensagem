const { autoUpdater } = require('electron-updater');
const { app, dialog } = require('electron');
const log = require('electron-log');
const automationModule = require('./automation');
const quoteAutomationModule = require('./automation/quotes');

const automation = automationModule.default || automationModule;
const quoteAutomation = quoteAutomationModule.default || quoteAutomationModule;

// Configurar logs
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

// Configurar auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let cleanupPromise = null;
let shutdownHandlersRegistered = false;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function prepareAppForInstall() {
  if (cleanupPromise) {
    return cleanupPromise;
  }

  cleanupPromise = (async () => {
    log.info('Preparando o app para instalar a atualização...');

    const tasks = [];

    if (automation && typeof automation.shutdown === 'function') {
      tasks.push(
        automation.shutdown().catch((error) => {
          log.error('Erro ao encerrar automação principal antes do update:', error);
        })
      );
    }

    if (quoteAutomation && typeof quoteAutomation.shutdown === 'function') {
      tasks.push(
        quoteAutomation.shutdown().catch((error) => {
          log.error('Erro ao encerrar automações de cotação antes do update:', error);
        })
      );
    }

    if (tasks.length > 0) {
      await Promise.allSettled(tasks);
    }

    // Dá tempo para o sistema operacional liberar locks em executáveis e arquivos nativos.
    await delay(1200);
  })().finally(() => {
    cleanupPromise = null;
  });

  return cleanupPromise;
}

function registerShutdownHandlers() {
  if (shutdownHandlersRegistered) {
    return;
  }

  shutdownHandlersRegistered = true;

  app.on('before-quit', () => {
    void prepareAppForInstall();
  });
}

function setupAutoUpdater(mainWindow) {
  registerShutdownHandlers();

  // Verificar atualizações quando o app iniciar
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 3000);

  // Verificar a cada 30 minutos
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 30 * 60 * 1000);

  // Quando encontrar atualização disponível
  autoUpdater.on('update-available', (info) => {
    log.info('Atualização disponível:', info.version);
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Atualização Disponível',
      message: `Nova versão ${info.version} disponível!`,
      detail: 'Deseja baixar e instalar agora?',
      buttons: ['Sim', 'Depois']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
        
        // Mostrar progresso
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Baixando Atualização',
          message: 'Baixando atualização...',
          detail: 'Por favor, aguarde. Você será notificado quando terminar.',
          buttons: ['OK']
        });
      }
    });
  });

  // Quando não houver atualizações
  autoUpdater.on('update-not-available', () => {
    log.info('App está atualizado');
  });

  // Progresso do download
  autoUpdater.on('download-progress', (progressObj) => {
    let message = `Baixando ${Math.round(progressObj.percent)}%`;
    log.info(message);
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-progress', {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    }
  });

  // Quando o download terminar
  autoUpdater.on('update-downloaded', (info) => {
    log.info('Atualização baixada:', info.version);
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Atualização Pronta',
      message: 'Atualização baixada com sucesso!',
      detail: 'O aplicativo será reiniciado para aplicar as atualizações.',
      buttons: ['Reiniciar Agora', 'Reiniciar Depois']
    }).then(async (result) => {
      if (result.response === 0) {
        await prepareAppForInstall();

        setImmediate(() => {
          autoUpdater.quitAndInstall();
        });
      }
    });
  });

  // Erros
  autoUpdater.on('error', (error) => {
    log.error('Erro ao atualizar:', error);

    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Falha na atualização',
        message: 'Não foi possível aplicar a atualização automaticamente.',
        detail: [
          'Feche automações e janelas auxiliares abertas e tente novamente.',
          error?.message ? `Detalhes técnicos: ${error.message}` : null
        ].filter(Boolean).join('\n\n'),
        buttons: ['OK']
      }).catch(() => {});
    }
  });
}

module.exports = { setupAutoUpdater };


