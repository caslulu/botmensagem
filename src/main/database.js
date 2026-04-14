const fs = require('fs');
const path = require('path');
const { initDatabase, saveDatabase, parseJsonSafe, DB_DIR, DB_PATH } = require('./infra/db/sqlite');
const messagesRepo = require('./infra/db/messages-repository');
const profileSettingsRepo = require('./infra/db/profile-settings-repository');
const profilesRepo = require('./infra/db/profiles-repository');
const quotesRepo = require('./infra/db/quotes-repository');
const roadmapRepo = require('./infra/db/roadmap-repository');
const { resolveAsset } = require('./utils/asset-paths');
const PathResolverModule = require('./automation/utils/path-resolver');
const PathResolver = PathResolverModule.default || PathResolverModule;

const { MAX_PROFILES } = profilesRepo;

const PROFILE_ASSET_PATH = ['assets', 'images', 'profiles'];

function resolveProfileImage(fileName) {
  return resolveAsset(...PROFILE_ASSET_PATH, fileName);
}

function ensureDefaultProfileImages() {
  const profilesDir = path.join(PathResolver.getUserDataDir(), 'profiles');
  try {
    fs.mkdirSync(profilesDir, { recursive: true });
  } catch (_) {
    // Falha ao criar diretório não deve derrubar a inicialização.
  }

  const defaults = [
    { id: 'thiago', fileName: 'imagem_thiago.jpg' },
    { id: 'debora', fileName: 'imagem_debora.jpg' }
  ];

  defaults.forEach(({ id, fileName }) => {
    const profile = profilesRepo.getProfileById(id);
    if (!profile) return;

    const currentPath = profile.image_path;
    const assetPath = resolveProfileImage(fileName);
    const userDataPath = path.join(profilesDir, fileName);

    const currentPathIsUserData = currentPath === userDataPath;

    // Se já está no destino e existe, nada a fazer.
    if (currentPathIsUserData && fs.existsSync(userDataPath)) {
      return;
    }

    // Copia o asset padrão para userData e atualiza o banco para o caminho final.
    if (fs.existsSync(assetPath)) {
      try {
        if (!fs.existsSync(userDataPath)) {
          fs.copyFileSync(assetPath, userDataPath);
        }
        profilesRepo.updateProfile(id, { imagePath: userDataPath });
      } catch (error) {
        console.warn(`Falha ao ajustar imagem do perfil ${id}:`, error.message);
      }
    }
  });
}

// Keep compatibility exports while delegating to repositories
const getMessages = messagesRepo.getMessages;
const getSelectedMessage = messagesRepo.getSelectedMessage;
const addMessage = messagesRepo.addMessage;
const updateMessage = messagesRepo.updateMessage;
const deleteMessage = messagesRepo.deleteMessage;
const selectMessage = messagesRepo.selectMessage;
const seedInitialMessages = messagesRepo.seedInitialMessages;

const getProfileSettings = profileSettingsRepo.getProfileSettings;
const updateProfileSettings = profileSettingsRepo.updateProfileSettings;

const getAllProfiles = profilesRepo.getAllProfiles;
const getProfileById = profilesRepo.getProfileById;
const getProfileSession = profilesRepo.getProfileSession;
const updateProfileSessionUsage = profilesRepo.updateProfileSessionUsage;
const migrateSessionDirs = profilesRepo.migrateSessionDirs;
const getProfileCount = profilesRepo.getProfileCount;
const createProfile = profilesRepo.createProfile;
const updateProfile = profilesRepo.updateProfile;

const listQuotes = quotesRepo.listQuotes;
const getQuoteById = quotesRepo.getQuoteById;
const upsertQuoteRecord = quotesRepo.upsertQuoteRecord;
const deleteQuoteById = quotesRepo.deleteQuoteById;

const listRoadmapItems = roadmapRepo.listRoadmapItems;
const createRoadmapItem = roadmapRepo.createRoadmapItem;
const updateRoadmapStatus = roadmapRepo.updateRoadmapStatus;
const updateRoadmapItem = roadmapRepo.updateRoadmapItem;
const deleteRoadmapItem = roadmapRepo.deleteRoadmapItem;

function seedInitialProfiles() {
  // mirror original behavior but via repo APIs
  if (profilesRepo.getProfileCount() === 0) {
    const initialProfiles = [
      {
        id: 'thiago',
        name: 'Thiago',
        image_path: resolveProfileImage('imagem_thiago.jpg'),
        default_message: `🚨 *PARE DE PAGAR CARO NO SEGURO!* 🚨\n👉 Carro | Moto\n\n💰 *ECONOMIZE ATÉ 50% AGORA!*\n✅ As melhores taxas do mercado\n✅ Cotações rápidas, sem enrolação\n\n📋 *Aceitamos:*\n• Drivh\n• CNH brasileira\n• Passaporte\n• Habilitação estrangeira\n\n🧑‍💼 Thiago | Seu Corretor de Confiança\nFale comigo no WhatsApp e receba sua cotação em minutos:\n👉 https://wa.me/message/BMDAOE4YSM7HN1`,
        is_admin: 1
      },
      {
        id: 'debora',
        name: 'Debora',
        image_path: resolveProfileImage('imagem_debora.jpg'),
        default_message: `🔒 SEGURANÇA NO VOLANTE COMEÇA AQUI!\n� Seguro de carro, moto e casa\n\n�REDUZA SEU SEGURO EM ATÉ 50%, GARANTIMOS AS MELHORES TAXAS DO MERCADO\n\n� COTAÇÃO RÁPIDA E SEM BUROCRACIA!\nAceitamos: \n* CNH \n* Passaporte \n* Habilitação estrangeira\n\n👩🏻‍💼Débora | Corretora de Seguros\n📞 Clique aqui e peça sua cotação:\nhttps://wa.me/message/X4X7FBTDBF7RH1`,
        is_admin: 1
      }
    ];

    initialProfiles.forEach((p) => {
      try {
        profilesRepo.createProfile(p);
      } catch (error) {
        console.error('Erro ao criar perfil inicial', p.id, error);
      }
    });
  }

  ensureDefaultProfileImages();
}

module.exports = {
  initDatabase,
  saveDatabase,
  parseJsonSafe,
  DB_DIR,
  DB_PATH,
  // messages
  getMessages,
  getSelectedMessage,
  addMessage,
  updateMessage,
  deleteMessage,
  selectMessage,
  seedInitialMessages,
  // profiles
  getProfileSettings,
  updateProfileSettings,
  seedInitialProfiles,
  getAllProfiles,
  getProfileById,
  getProfileSession,
  updateProfileSessionUsage,
  migrateSessionDirs,
  getProfileCount,
  createProfile,
  updateProfile,
  // quotes
  listQuotes,
  getQuoteById,
  upsertQuoteRecord,
  deleteQuoteById,
  // roadmap
  listRoadmapItems,
  createRoadmapItem,
  updateRoadmapStatus,
  updateRoadmapItem,
  deleteRoadmapItem,
  // constants
  MAX_PROFILES
};
