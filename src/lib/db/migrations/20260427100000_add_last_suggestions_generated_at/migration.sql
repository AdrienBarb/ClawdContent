-- Backfill migration for a column that was added to schema.prisma in
-- 2ce71ae without an accompanying migration file. The dev DB already has it
-- (added via `prisma db push` or similar). This file aligns the migration
-- history so future `migrate dev` runs don't trip on drift.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "lastSuggestionsGeneratedAt" TIMESTAMP(3);
