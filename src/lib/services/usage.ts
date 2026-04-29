import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { UsageLimitError } from "@/lib/errors/UsageLimitError";
import {
  getCap,
  pointsFor,
  type UsageType,
} from "@/lib/constants/usage";
import { createLogger } from "@/lib/logger";

const log = createLogger("usage");

// ─── bucket helpers ──────────────────────────────────────────────────────────

const FREE_BUCKET = "free-lifetime";
const PERIOD_PREFIX = "period:";
const TOPUP_PREFIX = "topup:";

const ACTIVE_SUB_STATUSES = new Set(["active", "trialing", "past_due"]);

function periodBucket(periodStart: Date): string {
  return `${PERIOD_PREFIX}${periodStart.toISOString().slice(0, 10)}`;
}

interface SubscriptionContext {
  isPaid: boolean;
  activeBucket: string;
  resetAt: Date | null;
}

async function getSubscriptionContext(
  userId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<SubscriptionContext> {
  const sub = await client.subscription.findUnique({
    where: { userId },
    select: {
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
    },
  });

  const isPaid =
    !!sub &&
    ACTIVE_SUB_STATUSES.has(sub.status) &&
    !!sub.currentPeriodStart &&
    !!sub.currentPeriodEnd &&
    sub.currentPeriodEnd.getTime() > Date.now();

  if (isPaid && sub?.currentPeriodStart) {
    return {
      isPaid: true,
      activeBucket: periodBucket(sub.currentPeriodStart),
      resetAt: sub.currentPeriodEnd ?? null,
    };
  }

  return {
    isPaid: false,
    activeBucket: FREE_BUCKET,
    resetAt: null,
  };
}

// ─── balance ─────────────────────────────────────────────────────────────────
//
// Single-pool model: balance is a sum across ALL action types in the active
// period bucket plus all topup buckets. The `type` column is preserved on
// each ledger row for analytics and audit, but the BALANCE itself is one
// number for the user.

interface BalanceArgs {
  userId: string;
  context?: SubscriptionContext;
  tx?: Prisma.TransactionClient;
}

async function readSumForBuckets(
  client: Prisma.TransactionClient | typeof prisma,
  userId: string,
  buckets: string[]
): Promise<number> {
  if (buckets.length === 0) return 0;
  const result = await client.usageLedger.aggregate({
    where: { userId, bucket: { in: buckets } },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

async function activeTopupBuckets(
  client: Prisma.TransactionClient | typeof prisma,
  userId: string
): Promise<string[]> {
  const rows = await client.usageLedger.findMany({
    where: {
      userId,
      bucket: { startsWith: TOPUP_PREFIX },
    },
    select: { bucket: true },
    distinct: ["bucket"],
  });
  return rows.map((r) => r.bucket);
}

export async function getBalance({
  userId,
  context,
  tx,
}: BalanceArgs): Promise<number> {
  const client = tx ?? prisma;
  const ctx = context ?? (await getSubscriptionContext(userId, client));
  const cap = getCap(ctx.isPaid);

  const topupBuckets = await activeTopupBuckets(client, userId);
  const buckets = [ctx.activeBucket, ...topupBuckets];

  const ledgerSum = await readSumForBuckets(client, userId, buckets);
  const balance = cap + ledgerSum;

  log.info(
    `getBalance userId=${userId} balance=${balance}pts (cap=${cap}, ledgerSum=${ledgerSum}, isPaid=${ctx.isPaid}, bucket=${ctx.activeBucket}, topups=${topupBuckets.length})`
  );

  return balance;
}

export interface UsageBreakdown {
  // The only number the UI shows. Range 0–100. Topups inflate the
  // effective_cap so a freshly-bought pack lifts the percentage upward.
  percentageRemaining: number;
  resetAt: string | null;
  isPaid: boolean;
}

export async function getBalanceSummary(
  userId: string
): Promise<UsageBreakdown> {
  const ctx = await getSubscriptionContext(userId);
  const cap = getCap(ctx.isPaid);

  const topupBuckets = await activeTopupBuckets(prisma, userId);
  const topupTotal = topupBuckets.length
    ? (
        await prisma.usageLedger.aggregate({
          where: {
            userId,
            bucket: { in: topupBuckets },
            amount: { gt: 0 },
          },
          _sum: { amount: true },
        })
      )._sum.amount ?? 0
    : 0;

  const balance = await getBalance({ userId, context: ctx });
  const effectiveCap = cap + topupTotal;
  const safeBalance = Math.max(0, balance);
  const safeCap = Math.max(1, effectiveCap);
  const percentageRemaining = Math.min(
    100,
    Math.round((safeBalance / safeCap) * 100)
  );

  return {
    percentageRemaining,
    resetAt: ctx.resetAt ? ctx.resetAt.toISOString() : null,
    isPaid: ctx.isPaid,
  };
}

// ─── consume / refund ────────────────────────────────────────────────────────

function userLockKey(userId: string): bigint {
  let hash = BigInt(0);
  const prime = BigInt(1099511628211);
  const namespaced = `usage:${userId}`;
  for (let i = 0; i < namespaced.length; i++) {
    hash =
      (hash * prime + BigInt(namespaced.charCodeAt(i))) &
      BigInt("0x7fffffffffffffff");
  }
  return hash;
}

function isDedupConflict(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (err.code !== "P2002") return false;
  const target = (err.meta as { target?: string | string[] } | undefined)?.target;
  if (Array.isArray(target)) return target.includes("dedupKey");
  if (typeof target === "string") return target.includes("dedupKey");
  return false;
}

interface ConsumeArgs {
  userId: string;
  type: UsageType;
  // How many *actions* of this type. The service multiplies by the per-type
  // cost from ACTION_COST. So `count: 3` for "draft_generation" debits 6
  // points (3 × 2). Default 1.
  count?: number;
  dedupKey: string;
  metadata?: Prisma.InputJsonValue;
}

export async function consume({
  userId,
  type,
  count = 1,
  dedupKey,
  metadata,
}: ConsumeArgs): Promise<void> {
  if (count <= 0) {
    throw new Error(`consume: count must be positive, got ${count}`);
  }
  const points = pointsFor(type, count);

  log.info(
    `consume start userId=${userId} type=${type} count=${count} (=${points}pts) dedupKey=${dedupKey}`
  );

  const lockKey = userLockKey(userId);

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

      const existing = await tx.usageLedger.findUnique({
        where: { userId_dedupKey: { userId, dedupKey } },
        select: { id: true },
      });
      if (existing) {
        log.info(
          `consume skipped userId=${userId} dedupKey=${dedupKey} (already recorded — idempotent)`
        );
        return;
      }

      const ctx = await getSubscriptionContext(userId, tx);
      const balanceBefore = await getBalance({ userId, context: ctx, tx });

      if (balanceBefore < points) {
        log.warn(
          `consume REJECTED userId=${userId} balance=${balanceBefore}pts < required=${points}pts → UsageLimitError`
        );
        throw new UsageLimitError({
          attemptedType: type,
          percentageRemaining: 0,
          resetAt: ctx.resetAt,
          isPaid: ctx.isPaid,
        });
      }

      await tx.usageLedger.create({
        data: {
          userId,
          type,
          amount: -points,
          bucket: ctx.activeBucket,
          reason: "consume",
          dedupKey,
          metadata: metadata ?? Prisma.JsonNull,
        },
      });

      log.info(
        `consume ✓ userId=${userId} -${points}pts (${balanceBefore} → ${balanceBefore - points}) bucket=${ctx.activeBucket}`
      );
    },
    { timeout: 10_000 }
  );
}

interface RefundArgs {
  userId: string;
  type: UsageType;
  count: number;
  dedupKey: string;
  // The dedupKey of the ORIGINAL consume row. Refund lands in that row's
  // bucket so a period rollover between consume and refund doesn't distort
  // either period's total.
  originalConsumeDedupKey: string;
  metadata?: Prisma.InputJsonValue;
}

export async function refund({
  userId,
  type,
  count,
  dedupKey,
  originalConsumeDedupKey,
  metadata,
}: RefundArgs): Promise<void> {
  if (count <= 0) return;
  const points = pointsFor(type, count);

  const originalConsume = await prisma.usageLedger.findUnique({
    where: { userId_dedupKey: { userId, dedupKey: originalConsumeDedupKey } },
    select: { bucket: true },
  });
  const bucket =
    originalConsume?.bucket ??
    (await getSubscriptionContext(userId)).activeBucket;

  try {
    await prisma.usageLedger.create({
      data: {
        userId,
        type,
        amount: points,
        bucket,
        reason: "refund",
        dedupKey,
        metadata: metadata ?? Prisma.JsonNull,
      },
    });
    log.info(
      `refund ✓ userId=${userId} +${points}pts type=${type} count=${count} bucket=${bucket} dedupKey=${dedupKey}`
    );
  } catch (err) {
    if (isDedupConflict(err)) {
      log.info(
        `refund skipped userId=${userId} dedupKey=${dedupKey} (already recorded — idempotent)`
      );
      return;
    }
    log.error(
      `refund FAILED userId=${userId} dedupKey=${dedupKey}`,
      err
    );
    throw err;
  }
}

// ─── grants (Stripe webhook) ─────────────────────────────────────────────────

interface GrantTopupArgs {
  userId: string;
  stripeSessionId: string;
  // Pre-converted to points. The webhook resolves the pack constant and
  // passes points here so the service stays decoupled from pricing.
  points: number;
}

export async function grantTopup({
  userId,
  stripeSessionId,
  points,
}: GrantTopupArgs): Promise<void> {
  if (points <= 0) return;

  const bucket = `${TOPUP_PREFIX}${stripeSessionId}`;
  const dedupKey = `topup:${stripeSessionId}`;

  try {
    await prisma.usageLedger.create({
      data: {
        userId,
        // `type` on a grant row is just a tag for analytics — the row
        // affects the unified balance regardless. We tag it as
        // "draft_generation" historically because that's what the user
        // perceives they're buying capacity for.
        type: "draft_generation",
        amount: points,
        bucket,
        reason: "topup_grant",
        dedupKey,
        metadata: { stripeSessionId, points },
      },
    });
    log.info(
      `grantTopup ✓ userId=${userId} +${points}pts session=${stripeSessionId}`
    );
  } catch (err) {
    if (isDedupConflict(err)) {
      log.info(
        `grantTopup skipped userId=${userId} session=${stripeSessionId} (already granted — idempotent)`
      );
      return;
    }
    log.error(
      `grantTopup FAILED userId=${userId} session=${stripeSessionId}`,
      err
    );
    throw err;
  }
}
