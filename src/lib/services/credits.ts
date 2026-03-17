import { prisma } from "@/lib/db/prisma";
import { getPlanImageCredits, type PlanId } from "@/lib/constants/plans";

export async function getOrCreateCreditBalance(userId: string) {
  return prisma.creditBalance.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function getCreditBalance(userId: string) {
  const balance = await getOrCreateCreditBalance(userId);
  return {
    planCredits: balance.planCredits,
    topUpCredits: balance.topUpCredits,
    total: balance.planCredits + balance.topUpCredits,
  };
}

export async function deductCredit(
  userId: string
): Promise<{ success: boolean; pool?: "plan" | "topup" }> {
  // Ensure balance exists
  await getOrCreateCreditBalance(userId);

  // Try plan credits first (atomic)
  const planResult = await prisma.$executeRawUnsafe(
    `UPDATE "credit_balance" SET "planCredits" = "planCredits" - 1, "updatedAt" = NOW() WHERE "userId" = $1 AND "planCredits" > 0`,
    userId
  );

  if (planResult > 0) {
    await logTransaction(userId, -1, "plan", "generation");
    return { success: true, pool: "plan" };
  }

  // Try top-up credits (atomic)
  const topUpResult = await prisma.$executeRawUnsafe(
    `UPDATE "credit_balance" SET "topUpCredits" = "topUpCredits" - 1, "updatedAt" = NOW() WHERE "userId" = $1 AND "topUpCredits" > 0`,
    userId
  );

  if (topUpResult > 0) {
    await logTransaction(userId, -1, "topup", "generation");
    return { success: true, pool: "topup" };
  }

  return { success: false };
}

export async function refundCredit(
  userId: string,
  pool: "plan" | "topup",
  reference?: string
) {
  const column = pool === "plan" ? "planCredits" : "topUpCredits";
  await prisma.$executeRawUnsafe(
    `UPDATE "credit_balance" SET "${column}" = "${column}" + 1, "updatedAt" = NOW() WHERE "userId" = $1`,
    userId
  );
  await logTransaction(userId, 1, pool, "refund", reference);
}

export async function grantPlanCredits(userId: string, planId: PlanId) {
  const allowance = getPlanImageCredits(planId);
  await getOrCreateCreditBalance(userId);

  await prisma.creditBalance.update({
    where: { userId },
    data: { planCredits: allowance, lastResetAt: new Date() },
  });

  await logTransaction(userId, allowance, "plan", "plan_grant");
}

export async function handlePlanUpgrade(
  userId: string,
  oldPlanId: PlanId,
  newPlanId: PlanId
) {
  const oldAllowance = getPlanImageCredits(oldPlanId);
  const newAllowance = getPlanImageCredits(newPlanId);
  const diff = newAllowance - oldAllowance;

  if (diff <= 0) return;

  await getOrCreateCreditBalance(userId);

  await prisma.$executeRawUnsafe(
    `UPDATE "credit_balance" SET "planCredits" = "planCredits" + $1, "updatedAt" = NOW() WHERE "userId" = $2`,
    diff,
    userId
  );

  await logTransaction(userId, diff, "plan", "plan_upgrade");
}

export async function handlePlanDowngrade(
  userId: string,
  newPlanId: PlanId
) {
  const newAllowance = getPlanImageCredits(newPlanId);
  await getOrCreateCreditBalance(userId);

  await prisma.$executeRawUnsafe(
    `UPDATE "credit_balance" SET "planCredits" = LEAST("planCredits", $1), "updatedAt" = NOW() WHERE "userId" = $2`,
    newAllowance,
    userId
  );

  await logTransaction(userId, 0, "plan", "plan_downgrade");
}

export async function handleCancellation(userId: string) {
  await getOrCreateCreditBalance(userId);

  await prisma.creditBalance.update({
    where: { userId },
    data: { planCredits: 0 },
  });

  await logTransaction(userId, 0, "plan", "cancellation");
}

export async function addTopUpCredits(
  userId: string,
  quantity: number,
  stripeSessionId?: string
) {
  await getOrCreateCreditBalance(userId);

  await prisma.$executeRawUnsafe(
    `UPDATE "credit_balance" SET "topUpCredits" = "topUpCredits" + $1, "updatedAt" = NOW() WHERE "userId" = $2`,
    quantity,
    userId
  );

  await logTransaction(
    userId,
    quantity,
    "topup",
    "topup_purchase",
    stripeSessionId
  );
}

async function logTransaction(
  userId: string,
  amount: number,
  pool: string,
  type: string,
  reference?: string
) {
  await prisma.creditTransaction.create({
    data: { userId, amount, pool, type, reference },
  });
}
