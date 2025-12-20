const {
  initDatabase,
  seedInitialProfiles,
  seedInitialMessages,
  getAllProfiles
} = require('./database');

async function initializeApp() {
  await initDatabase();
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
