const {
  initDatabase,
  seedInitialProfiles,
  seedInitialMessages,
  getAllProfiles
} = require('./database');

/**
 * Inicializa os serviços essenciais do app Electron.
 */
async function initializeApp() {
  await initDatabase();

  // Garante perfis base e respectivas mensagens padrão.
  seedInitialProfiles();

  const rawProfiles = getAllProfiles();
  const seedPayload = rawProfiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    imagePath: profile.image_path,
    message: profile.default_message
  }));

  seedInitialMessages(seedPayload);
}

module.exports = { initializeApp };
