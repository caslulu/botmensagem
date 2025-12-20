import * as database from './database';

type RawProfile = {
  id: string;
  name: string;
  image_path?: string | null;
  default_message?: string | null;
};

export async function initializeApp(): Promise<void> {
  await database.initDatabase();
  database.seedInitialProfiles();

  const rawProfiles = database.getAllProfiles() as RawProfile[];
  const seedPayload = rawProfiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    imagePath: profile.image_path ?? null,
    message: profile.default_message ?? null
  }));

  database.seedInitialMessages(seedPayload);
}
