-- Postgres does NOT auto-index FK columns. Every per-user ownership check
-- (chat tools, suggestions PATCH/POST/DELETE, generation routes) joins
-- through `social_account.lateProfileId` → `late_profile.userId`. Without
-- this index, the join falls back to a sequential scan on `social_account`.
CREATE INDEX IF NOT EXISTS "social_account_lateProfileId_idx"
  ON "social_account" ("lateProfileId");
