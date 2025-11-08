// New profile access layer backed by database tables
const {
  getSelectedMessage,
  getProfileSettings,
  getAllProfiles,
  getProfileById,
  getProfileSession,
  updateProfileSessionUsage
} = require('./database');

/**
 * Shape returned:
 * {
 *   id, name, imagePath, sessionDir, message, sendLimit
 * }
 */
function mapDbProfile(rawProfile) {
  if (!rawProfile) return null;

  // Base properties from profiles table
  const profile = {
    id: rawProfile.id,
    name: rawProfile.name,
    imagePath: rawProfile.image_path,
    message: rawProfile.default_message,
    sendLimit: 200,
    sessionDir: null
  };

  // Override message & image from selected message (messages table)
  const selectedMessage = getSelectedMessage(rawProfile.id);
  if (selectedMessage) {
    profile.message = selectedMessage.text;
    if (selectedMessage.image_path) {
      profile.imagePath = selectedMessage.image_path;
    }
  }

  // Load profile settings (send limit)
  const settings = getProfileSettings(rawProfile.id);
  if (settings && settings.send_limit) {
    profile.sendLimit = settings.send_limit;
  }

  // Session info
  const sessionInfo = getProfileSession(rawProfile.id);
  if (sessionInfo) {
    profile.sessionDir = sessionInfo.session_dir;
    // Update last used timestamp opportunistically
    updateProfileSessionUsage(rawProfile.id);
  }

  return profile;
}

function getProfiles() {
  const dbProfiles = getAllProfiles();
  return dbProfiles.map(mapDbProfile);
}

function findProfileById(id) {
  const raw = getProfileById(id);
  return mapDbProfile(raw);
}

module.exports = { getProfiles, findProfileById };
