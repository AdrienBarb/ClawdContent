import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { validatePost } from "@/lib/late/mutations";

const SAMPLE_IMAGE = "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=1080";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const account = await prisma.socialAccount.findFirst({
    where: { platform: "tiktok" },
    include: { lateProfile: true },
  });

  if (!account) {
    console.error("No connected TikTok account found in dev DB");
    process.exit(2);
  }

  console.log(`Probing @${account.username} (${account.lateAccountId})`);

  const result = await validatePost(
    "Test photo carousel — read-only validate",
    "tiktok",
    [{ url: SAMPLE_IMAGE, type: "image" }],
    account.lateProfile.lateApiKey,
  );

  console.log("\nValidate result:");
  console.log(JSON.stringify(result, null, 2));

  if (!result.valid) {
    console.error("\n✗ Zernio rejected TikTok photo carousel");
    process.exit(1);
  }
  console.log("\n✓ Zernio accepts TikTok photo carousel");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
