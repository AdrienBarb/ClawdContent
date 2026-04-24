-- Migrate all subscriptions to the unified "pro" plan
UPDATE "subscription" SET "planId" = 'pro' WHERE "planId" != 'pro';
