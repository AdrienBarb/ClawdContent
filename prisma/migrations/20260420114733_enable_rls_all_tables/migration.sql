-- Enable Row Level Security on all tables
-- Since the app connects via the `postgres` role (which bypasses RLS),
-- Prisma will continue to work normally.
-- This blocks access via Supabase's public API (anon/authenticated roles).

ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fly_machine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "late_profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "social_account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "media" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stripe_event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credit_balance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credit_transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "image_generation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
