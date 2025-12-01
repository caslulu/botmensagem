const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');
const log = require('electron-log');

// Configurar logs
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

// Configurar auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function setupAutoUpdater(mainWindow) {
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
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  // Erros
  autoUpdater.on('error', (error) => {
    log.error('Erro ao atualizar:', error);
  });
}

module.exports = { setupAutoUpdater };


