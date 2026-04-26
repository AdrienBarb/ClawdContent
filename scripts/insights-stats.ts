import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const grouped = await prisma.socialAccount.groupBy({
    by: ["status", "analysisStatus"],
    _count: true,
    orderBy: [{ status: "asc" }, { analysisStatus: "asc" }],
  });

  console.log("\n┌─ SocialAccount counts ──────────────────────────────");
  for (const g of grouped) {
    console.log(`│  status=${g.status.padEnd(15)} analysisStatus=${g.analysisStatus.padEnd(12)} → ${g._count}`);
  }

  const activePending = await prisma.socialAccount.findMany({
    where: { status: "active", analysisStatus: "pending" },
    select: {
      id: true, platform: true, username: true,
      lateProfile: { select: { user: { select: { email: true } } } },
    },
    take: 20,
  });
  if (activePending.length > 0) {
    console.log("\n┌─ Still pending (active) ────────────────────────────");
    for (const a of activePending) {
      console.log(`│  ${a.platform.padEnd(10)} @${a.username.padEnd(30)} ${a.lateProfile.user.email}`);
    }
  } else {
    console.log("\n✅ Zero active accounts still pending.");
  }

  const failed = await prisma.socialAccount.findMany({
    where: { status: "active", analysisStatus: "failed" },
    select: {
      id: true, platform: true, username: true,
      lateProfile: { select: { user: { select: { email: true } } } },
    },
  });
  if (failed.length > 0) {
    console.log("\n┌─ FAILED (active) ───────────────────────────────────");
    for (const a of failed) {
      console.log(`│  ${a.platform.padEnd(10)} @${a.username.padEnd(30)} ${a.lateProfile.user.email}  [${a.id}]`);
    }
  }

  const suggestionsCount = await prisma.postSuggestion.count();
  console.log(`\n📝 Total post suggestions in DB: ${suggestionsCount}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
