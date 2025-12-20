// Profile access layer backed by database tables
const { getSelectedMessage } = require('./infra/db/messages-repository');
const {
  getProfileSettings
} = require('./infra/db/profile-settings-repository');
const {
  getAllProfiles,
  getProfileById,
  getProfileSession,
  updateProfileSessionUsage,
  createProfile: createProfileRecord,
  updateProfile: updateProfileRecord,
  MAX_PROFILES
} = require('./infra/db/profiles-repository');
const { DEFAULT_AVATAR_TOKEN } = require('./constants/profile');

function mapDbProfile(rawProfile) {
  if (!rawProfile) return null;

  const storedImagePath = rawProfile.image_path;
  const profile = {
    id: rawProfile.id,
    name: rawProfile.name,
    imagePath: storedImagePath === DEFAULT_AVATAR_TOKEN ? null : storedImagePath,
    message: rawProfile.default_message,
    sendLimit: 200,
    sessionDir: null,
    isAdmin: rawProfile.is_admin === 1
  };

  const selectedMessage = getSelectedMessage(rawProfile.id);
  if (selectedMessage) {
    profile.message = selectedMessage.text;
    if (selectedMessage.image_path) {
      profile.imagePath = selectedMessage.image_path;
    }
  }

  const settings = getProfileSettings(rawProfile.id);
  if (settings && settings.send_limit) {
    profile.sendLimit = settings.send_limit;
  }

  const sessionInfo = getProfileSession(rawProfile.id);
  if (sessionInfo) {
    profile.sessionDir = sessionInfo.session_dir;
    updateProfileSessionUsage(rawProfile.id);
  }

  return profile;
}

function getProfiles() {
  const dbProfiles = getAllProfiles();
  return dbProfiles.slice(0, MAX_PROFILES).map(mapDbProfile);
}

function findProfileById(id) {
  const raw = getProfileById(id);
  return mapDbProfile(raw);
}

function createProfile(profile) {
  const created = createProfileRecord(profile);
  return mapDbProfile(created);
}

function updateProfile(id, updates) {
  const updated = updateProfileRecord(id, updates);
  return mapDbProfile(updated);
}

module.exports = { getProfiles, findProfileById, createProfile, updateProfile };
