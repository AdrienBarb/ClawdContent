import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const email = process.argv[2];
  if (!email) {
    console.error("Usage: tsx scripts/inspect-user.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { email },
    include: {
      lateProfile: {
        include: {
          socialAccounts: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!user) {
    console.error("User not found");
    process.exit(1);
  }

  console.log(`\nUser: ${user.email}  [${user.id}]`);
  console.log(`LateProfile id: ${user.lateProfile?.lateProfileId}`);
  console.log(`Accounts: ${user.lateProfile?.socialAccounts.length ?? 0}\n`);

  for (const a of user.lateProfile?.socialAccounts ?? []) {
    console.log(`${a.platform.padEnd(10)} @${a.username.padEnd(28)}  status=${a.status.padEnd(13)}  analysis=${a.analysisStatus.padEnd(10)}  insights=${a.insights ? "Y" : "N"}  late=${a.lateAccountId}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
