// Profile access layer backed by database tables
import { getSelectedMessage } from './infra/db/messages-repository';
import { getProfileSettings } from './infra/db/profile-settings-repository';
import {
  getAllProfiles,
  getProfileById,
  getProfileSession,
  updateProfileSessionUsage,
  createProfile as createProfileRecord,
  updateProfile as updateProfileRecord,
  deleteProfile as deleteProfileRecord,
  MAX_PROFILES,
  type ProfileRecord
} from './infra/db/profiles-repository';
import { DEFAULT_AVATAR_TOKEN } from './constants/profile';

type ProfileView = {
  id: string;
  name: string;
  imagePath: string | null;
  message: string | null;
  sendLimit: number;
  sessionDir: string | null;
  isAdmin: boolean;
};

function mapDbProfile(rawProfile: ProfileRecord | null): ProfileView | null {
  if (!rawProfile) return null;

  const storedImagePath = rawProfile.image_path;
  const profile: ProfileView = {
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

export function getProfiles(): Array<ProfileView | null> {
  const dbProfiles = getAllProfiles();
  return dbProfiles.slice(0, MAX_PROFILES).map(mapDbProfile);
}

export function findProfileById(id: string): ProfileView | null {
  const raw = getProfileById(id);
  return mapDbProfile(raw);
}

export function createProfile(profile: Partial<ProfileRecord>): ProfileView | null {
  const created = createProfileRecord(profile as any);
  return mapDbProfile(created);
}

export function updateProfile(id: string, updates: Partial<ProfileRecord>): ProfileView | null {
  const updated = updateProfileRecord(id, updates as any);
  return mapDbProfile(updated);
}

export function deleteProfile(id: string): boolean {
  return deleteProfileRecord(id);
}

export { MAX_PROFILES };
