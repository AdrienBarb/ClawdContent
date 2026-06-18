import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// READ-ONLY diagnostic for the autopilot mode-switch bug. Never mutates.
async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const email = process.argv[2];
  if (!email) {
    console.error("Usage: tsx scripts/inspect-autopilot.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { email },
    select: {
      id: true,
      email: true,
      autopilotMode: true,
      autopilotPausedAt: true,
      pendingBrief: true,
    },
  });
  if (!user) {
    console.error("User not found");
    process.exit(1);
  }

  console.log(`\n=== USER ===`);
  console.log(`email=${user.email} id=${user.id}`);
  console.log(`autopilotMode=${user.autopilotMode}`);
  console.log(`autopilotPausedAt=${user.autopilotPausedAt?.toISOString() ?? "null"}`);
  console.log(`pendingBrief=${user.pendingBrief ? JSON.stringify(user.pendingBrief).slice(0, 80) : "null"}`);

  const batches = await prisma.weeklyBatch.findMany({
    where: { userId: user.id },
    orderBy: { weekStart: "desc" },
    take: 4,
  });

  console.log(`\n=== WEEKLY BATCHES (latest ${batches.length}) ===`);
  for (const b of batches) {
    const posts = (Array.isArray(b.posts) ? b.posts : []) as Array<{
      status?: string;
      externalPostId?: string | null;
      suggestionId?: string | null;
      platform?: string;
    }>;
    const byStatus = posts.reduce<Record<string, number>>((acc, p) => {
      const k = p.status ?? "?";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
    const withExternal = posts.filter((p) => p.externalPostId).length;
    const withSuggestion = posts.filter((p) => p.suggestionId).length;
    console.log(
      `\nbatch=${b.id} weekStart=${b.weekStart.toISOString()} status=${b.status} mode=${b.mode} approvedAt=${b.approvedAt?.toISOString() ?? "null"}`
    );
    console.log(
      `  posts=${posts.length} byStatus=${JSON.stringify(byStatus)} withExternalPostId=${withExternal} withSuggestionId=${withSuggestion}`
    );
  }

  // Local PostSuggestion rows still on disk (committed full_auto deletes them).
  const accounts = await prisma.socialAccount.findMany({
    where: { lateProfile: { userId: user.id } },
    select: { id: true },
  });
  const suggestions = await prisma.postSuggestion.findMany({
    where: { socialAccountId: { in: accounts.map((a) => a.id) } },
    select: { id: true, status: true, batchId: true, scheduledAt: true },
    orderBy: { createdAt: "desc" },
  });
  const sugByStatus = suggestions.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`\n=== LOCAL POST SUGGESTIONS ===`);
  console.log(`total=${suggestions.length} byStatus=${JSON.stringify(sugByStatus)}`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
