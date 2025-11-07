const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const automation = require('./automation');
const { getProfiles, findProfileById } = require('./profiles');
const { setupAutoUpdater } = require('./updater');
const { 
  initDatabase,
  getMessages, 
  getSelectedMessage, 
  addMessage, 
  updateMessage, 
  deleteMessage, 
  selectMessage,
  seedInitialMessages,
  getProfileSettings,
  updateProfileSettings
} = require('./database');

const isDev = process.env.NODE_ENV === 'development';
let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Configurar auto-update apenas em produção
    setupAutoUpdater(mainWindow);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.caslulu.botmensagem');
  }

  // Initialize database
  await initDatabase();
  
  // Seed initial messages
  seedInitialMessages(getProfiles());

  createMainWindow();

  automation.on('log', (message) => {
    if (mainWindow) {
      mainWindow.webContents.send('automation:log', message);
    }
  });

  automation.on('status', (payload) => {
    if (mainWindow) {
      mainWindow.webContents.send('automation:status', payload);
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('automation:profiles', async () => {
  return getProfiles().map((profile) => {
    let thumbnailData = null;
    
    // Convert image to base64 if it exists
    if (profile.imagePath && fs.existsSync(profile.imagePath)) {
      try {
        const imageBuffer = fs.readFileSync(profile.imagePath);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = profile.imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
        thumbnailData = `data:${mimeType};base64,${base64Image}`;
      } catch (error) {
        console.error(`Erro ao carregar imagem para ${profile.name}:`, error);
      }
    }
    
    return {
      id: profile.id,
      name: profile.name,
      message: profile.message,
      thumbnail: thumbnailData
    };
  });
});

ipcMain.handle('automation:start', async (_event, profileId) => {
  const profile = findProfileById(profileId);
  if (!profile) {
    throw new Error(`Perfil desconhecido: ${profileId}`);
  }

  return automation.start(profile);
});

ipcMain.handle('automation:stop', async () => {
  return automation.stop();
});

// Message management handlers
ipcMain.handle('messages:get', async (_event, profileId) => {
  try {
    const messages = getMessages(profileId);
    
    // Add thumbnail data to messages
    return messages.map(msg => {
      let thumbnailData = null;
      
      if (msg.image_path && fs.existsSync(msg.image_path)) {
        try {
          const imageBuffer = fs.readFileSync(msg.image_path);
          const base64Image = imageBuffer.toString('base64');
          const mimeType = msg.image_path.endsWith('.png') ? 'image/png' : 'image/jpeg';
          thumbnailData = `data:${mimeType};base64,${base64Image}`;
        } catch (error) {
          console.error(`Erro ao carregar imagem da mensagem ${msg.id}:`, error);
        }
      }
      
      return {
        id: msg.id,
        profileId: msg.profile_id,
        text: msg.text,
        imagePath: msg.image_path,
        thumbnail: thumbnailData,
        isSelected: msg.is_selected === 1,
        createdAt: msg.created_at,
        updatedAt: msg.updated_at
      };
    });
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    throw error;
  }
});

ipcMain.handle('messages:add', async (_event, profileId, text, imagePath) => {
  try {
    const messageId = addMessage(profileId, text, imagePath);
    return { success: true, messageId };
  } catch (error) {
    console.error('Erro ao adicionar mensagem:', error);
    throw error;
  }
});

ipcMain.handle('messages:update', async (_event, messageId, text, imagePath) => {
  try {
    const success = updateMessage(messageId, text, imagePath);
    return { success };
  } catch (error) {
    console.error('Erro ao atualizar mensagem:', error);
    throw error;
  }
});

ipcMain.handle('messages:delete', async (_event, messageId) => {
  try {
    const success = deleteMessage(messageId);
    return { success };
  } catch (error) {
    console.error('Erro ao deletar mensagem:', error);
    throw error;
  }
});

ipcMain.handle('messages:select', async (_event, messageId) => {
  try {
    const success = selectMessage(messageId);
    return { success };
  } catch (error) {
    console.error('Erro ao selecionar mensagem:', error);
    throw error;
  }
});

// File selection handler
ipcMain.handle('file:select-image', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] }
      ],
      title: 'Selecione uma imagem'
    });
    
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, path: null };
    }
    
    return { success: true, path: result.filePaths[0] };
  } catch (error) {
    console.error('Erro ao selecionar imagem:', error);
    throw error;
  }
});

// Profile settings handlers
ipcMain.handle('profile:get-settings', async (_event, profileId) => {
  try {
    const settings = getProfileSettings(profileId);
    return settings;
  } catch (error) {
    console.error('Erro ao buscar configurações do perfil:', error);
    throw error;
  }
});

ipcMain.handle('profile:update-send-limit', async (_event, profileId, sendLimit) => {
  try {
    const success = updateProfileSettings(profileId, sendLimit);
    return { success };
  } catch (error) {
    console.error('Erro ao atualizar limite de envios:', error);
    throw error;
  }
});

