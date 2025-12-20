const {
  getProfileSettings,
  updateProfileSettings
} = require('../../infra/db/profile-settings-repository');
const {
  getProfiles,
  findProfileById,
  createProfile,
  updateProfile
} = require('../../profiles');
const { formatProfileForRenderer } = require('../../utils/profile-formatter');
const { createSuccess, createError } = require('../../utils/result');

function list() {
  return getProfiles().map(formatProfileForRenderer);
}

function get(id) {
  const profile = findProfileById(id);
  if (!profile) {
    return null;
  }
  return formatProfileForRenderer(profile);
}

function create(profileData) {
  try {
    const created = createProfile(profileData);
    return createSuccess({ profile: formatProfileForRenderer(created) });
  } catch (error) {
    return createError(error);
  }
}

function update(id, updates) {
  try {
    const profile = updateProfile(id, updates);
    return createSuccess({ profile: formatProfileForRenderer(profile) });
  } catch (error) {
    return createError(error);
  }
}

function getSettings(profileId) {
  return getProfileSettings(profileId);
}

function updateSendLimit(profileId, sendLimit) {
  const success = updateProfileSettings(profileId, sendLimit);
  return { success };
}

module.exports = {
  list,
  get,
  create,
  update,
  getSettings,
  updateSendLimit
};
