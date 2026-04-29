-- Event-sourced ledger for AI usage allowance.
-- See src/lib/db/schema.prisma :: UsageLedger for bucket / dedupKey conventions.

CREATE TABLE "usage_ledger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "bucket" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "dedupKey" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_ledger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usage_ledger_userId_dedupKey_key" ON "usage_ledger"("userId", "dedupKey");
CREATE INDEX "usage_ledger_userId_type_idx" ON "usage_ledger"("userId", "type");
CREATE INDEX "usage_ledger_userId_bucket_idx" ON "usage_ledger"("userId", "bucket");

ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
