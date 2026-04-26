import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  const ids = process.argv.slice(2);
  const accounts = await prisma.socialAccount.findMany({
    where: { id: { in: ids } },
    select: { id: true, platform: true, username: true, status: true, analysisStatus: true, lastAnalyzedAt: true, insights: true },
  });
  for (const a of accounts) {
    console.log(`\n${a.platform.padEnd(10)} @${a.username}  [${a.id}]`);
    console.log(`  status:         ${a.status}`);
    console.log(`  analysisStatus: ${a.analysisStatus}`);
    console.log(`  lastAnalyzedAt: ${a.lastAnalyzedAt}`);
    console.log(`  insights:       ${a.insights ? "PRESENT" : "NULL"}`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
