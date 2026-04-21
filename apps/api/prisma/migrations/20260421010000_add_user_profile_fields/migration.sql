ALTER TABLE "users"
  ADD COLUMN "avatar_path" TEXT,
  ADD COLUMN "avatar_mime_type" TEXT,
  ADD COLUMN "avatar_updated_at" TIMESTAMP(3);

ALTER TABLE "users"
  ALTER COLUMN "role" SET DEFAULT 'user';
