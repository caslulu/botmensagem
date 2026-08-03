-- Migration: init (kanban + quotes + files)
CREATE TABLE IF NOT EXISTS "kanban_columns" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "kanban_columns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "kanban_cards" (
  "id" TEXT NOT NULL,
  "column_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "payload" JSONB NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "kanban_cards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "quote_prices" (
  "id" TEXT NOT NULL,
  "card_id" TEXT,
  "payload" JSONB NOT NULL,
  "processed" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "quote_prices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "file_assets" (
  "id" TEXT NOT NULL,
  "card_id" TEXT,
  "kind" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "kanban_cards_column_id_position_idx" ON "kanban_cards"("column_id", "position");
CREATE INDEX IF NOT EXISTS "quote_prices_card_id_updated_at_idx" ON "quote_prices"("card_id", "updated_at");
CREATE INDEX IF NOT EXISTS "file_assets_card_id_kind_idx" ON "file_assets"("card_id", "kind");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kanban_cards_column_id_fkey') THEN
    ALTER TABLE "kanban_cards"
      ADD CONSTRAINT "kanban_cards_column_id_fkey"
      FOREIGN KEY ("column_id") REFERENCES "kanban_columns"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quote_prices_card_id_fkey') THEN
    ALTER TABLE "quote_prices"
      ADD CONSTRAINT "quote_prices_card_id_fkey"
      FOREIGN KEY ("card_id") REFERENCES "kanban_cards"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'file_assets_card_id_fkey') THEN
    ALTER TABLE "file_assets"
      ADD CONSTRAINT "file_assets_card_id_fkey"
      FOREIGN KEY ("card_id") REFERENCES "kanban_cards"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;