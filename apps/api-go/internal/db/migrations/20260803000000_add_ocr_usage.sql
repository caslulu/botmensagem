-- Migration: add_ocr_usage
-- Conta chamadas OCR por usuario por dia (limite de 15/dia).
CREATE TABLE IF NOT EXISTS "ocr_usage" (
  "user_id" TEXT NOT NULL,
  "day" DATE NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ocr_usage_pkey" PRIMARY KEY ("user_id", "day")
);

-- Flag de pago: quando atinge o limite e o usuario libera para o dia.
ALTER TABLE "ocr_usage"
  ADD COLUMN IF NOT EXISTS "paid" BOOLEAN NOT NULL DEFAULT false;