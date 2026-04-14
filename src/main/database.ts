import fs from 'fs';
import path from 'path';
import { initDatabase, saveDatabase, parseJsonSafe, DB_DIR, DB_PATH } from './infra/db/sqlite';
import * as messagesRepo from './infra/db/messages-repository';
import * as profileSettingsRepo from './infra/db/profile-settings-repository';
import * as profilesRepo from './infra/db/profiles-repository';
import * as quotesRepo from './infra/db/quotes-repository';
import { resolveAsset } from './utils/asset-paths';
import PathResolver from './automation/utils/path-resolver';

export const { MAX_PROFILES } = profilesRepo;

const PROFILE_ASSET_PATH = ['assets', 'images', 'profiles'] as const;

function resolveProfileImage(fileName: string): string {
  return resolveAsset(...PROFILE_ASSET_PATH, fileName);
}

function ensureDefaultProfileImages(): void {
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
        console.warn(`Falha ao ajustar imagem do perfil ${id}:`, (error as Error).message);
      }
    }
  });
}

// Keep compatibility exports while delegating to repositories
export const getMessages = messagesRepo.getMessages;
export const getSelectedMessage = messagesRepo.getSelectedMessage;
export const addMessage = messagesRepo.addMessage;
export const updateMessage = messagesRepo.updateMessage;
export const deleteMessage = messagesRepo.deleteMessage;
export const selectMessage = messagesRepo.selectMessage;
export const seedInitialMessages = messagesRepo.seedInitialMessages;

export const getProfileSettings = profileSettingsRepo.getProfileSettings;
export const updateProfileSettings = profileSettingsRepo.updateProfileSettings;

export const getAllProfiles = profilesRepo.getAllProfiles;
export const getProfileById = profilesRepo.getProfileById;
export const getProfileSession = profilesRepo.getProfileSession;
export const updateProfileSessionUsage = profilesRepo.updateProfileSessionUsage;
export const migrateSessionDirs = profilesRepo.migrateSessionDirs;
export const getProfileCount = profilesRepo.getProfileCount;
export const createProfile = profilesRepo.createProfile;
export const updateProfile = profilesRepo.updateProfile;

export const listQuotes = quotesRepo.listQuotes;
export const getQuoteById = quotesRepo.getQuoteById;
export const upsertQuoteRecord = quotesRepo.upsertQuoteRecord;
export const deleteQuoteById = quotesRepo.deleteQuoteById;

export function seedInitialProfiles(): void {
  // mirror original behavior but via repo APIs
  if (profilesRepo.getProfileCount() === 0) {
    const initialProfiles = [
      {
        id: 'thiago',
        name: 'Thiago',
        image_path: resolveProfileImage('imagem_thiago.jpg'),
        default_message: `🚨 *PARE DE PAGAR CARO NO SEGURO!* 🚨\n👉 Carro | Moto\n\n💰 *ECONOMIZE ATÉ 50% AGORA!*\n✅ As melhores taxas do mercado\n✅ Cotações rápidas, sem enrolação\n\n📋 *Aceitamos:*\n• Drivh\n• CNH brasileira\n• Passaporte\n• Habilitação estrangeira\n\n🧑‍💼 Thiago | Seu Corretor de Confiança\nFale comigo no WhatsApp e receba sua cotação em minutos:\n👉 https://wa.me/message/BMDAOE4YSM7HN1`,
        is_admin: true
      },
      {
        id: 'debora',
        name: 'Debora',
        image_path: resolveProfileImage('imagem_debora.jpg'),
        default_message: `🔒 SEGURANÇA NO VOLANTE COMEÇA AQUI!\n� Seguro de carro, moto e casa\n\n�REDUZA SEU SEGURO EM ATÉ 50%, GARANTIMOS AS MELHORES TAXAS DO MERCADO\n\n� COTAÇÃO RÁPIDA E SEM BUROCRACIA!\nAceitamos: \n* CNH \n* Passaporte \n* Habilitação estrangeira\n\n👩🏻‍💼Débora | Corretora de Seguros\n📞 Clique aqui e peça sua cotação:\nhttps://wa.me/message/X4X7FBTDBF7RH1`,
        is_admin: true
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

export { initDatabase, saveDatabase, parseJsonSafe, DB_DIR, DB_PATH };
