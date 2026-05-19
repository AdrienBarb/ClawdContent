-- ============================================================================
-- Pivot to social media manager
-- ============================================================================
-- Strips chat / wallet / v1-v2 split scaffolding and lays down the schema for
-- the autonomous social manager (per-account strategy + autopublish, brand
-- identity on user, image fields + approval flag on suggestions).
--
-- "IF EXISTS" on the User column drops covers the case where the previous
-- untracked migration `20260518120000_add_user_version_and_first_batch_approved`
-- was applied locally but never made it to production. On prod the columns
-- never existed, so the drops are no-ops there.
-- ============================================================================

-- ── Drop UsageLedger (and its FKs/indexes implicitly) ────────────────────────
DROP TABLE IF EXISTS "usage_ledger";

-- ── User: remove v1/v2 flags, add brand identity + trial fields ──────────────
ALTER TABLE "user" DROP COLUMN IF EXISTS "version";
ALTER TABLE "user" DROP COLUMN IF EXISTS "firstBatchApproved";
ALTER TABLE "user" ADD COLUMN "brandIdentity" JSONB;
ALTER TABLE "user" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN "trialNotifiedAt" TIMESTAMP(3);

-- ── SocialAccount: per-account strategy + autopublish toggles ────────────────
ALTER TABLE "social_account" ADD COLUMN "strategy" JSONB;
ALTER TABLE "social_account" ADD COLUMN "strategyDefinedAt" TIMESTAMP(3);
ALTER TABLE "social_account" ADD COLUMN "generationEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "social_account" ADD COLUMN "autopublish" BOOLEAN NOT NULL DEFAULT true;

-- ── PostSuggestion: image generation fields + approval flag ──────────────────
ALTER TABLE "post_suggestion" ADD COLUMN "imagePrompt" TEXT;
ALTER TABLE "post_suggestion" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "post_suggestion" ADD COLUMN "imageGeneratedAt" TIMESTAMP(3);
ALTER TABLE "post_suggestion" ADD COLUMN "approvalRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "post_suggestion" ADD COLUMN "approvedAt" TIMESTAMP(3);
