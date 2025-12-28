import { getProfileSettings, updateProfileSettings } from '../../infra/db/profile-settings-repository';
import { getProfiles, findProfileById, createProfile, updateProfile, deleteProfile } from '../../profiles';
import { formatProfileForRenderer } from '../../utils/profile-formatter';
import { createSuccess, createError } from '../../utils/result';

function list() {
  return (getProfiles() || []).map(formatProfileForRenderer).filter(Boolean);
}

function get(id: string) {
  const profile = findProfileById(id);
  if (!profile) {
    return null;
  }
  return formatProfileForRenderer(profile);
}

function create(profileData: any) {
  try {
    const created = createProfile(profileData);
    return createSuccess({ profile: formatProfileForRenderer(created) });
  } catch (error) {
    return createError(error);
  }
}

function update(id: string, updates: any) {
  try {
    const profile = updateProfile(id, updates);
    return createSuccess({ profile: formatProfileForRenderer(profile) });
  } catch (error) {
    return createError(error);
  }
}

function remove(id: string) {
  try {
    const success = deleteProfile(id);
    return createSuccess({ success });
  } catch (error) {
    return createError(error);
  }
}

function getSettings(profileId: string) {
  return getProfileSettings(profileId);
}

function updateSendLimit(profileId: string, sendLimit: number) {
  const success = updateProfileSettings(profileId, sendLimit);
  return { success };
}

export default {
  list,
  get,
  create,
  update,
  remove,
  getSettings,
  updateSendLimit
};

export { list, get, create, update, remove, getSettings, updateSendLimit };
