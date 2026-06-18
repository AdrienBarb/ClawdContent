import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { validatePost } from "../src/lib/late/mutations";
import { coerceMediaItems } from "../src/lib/schemas/mediaItems";

// Read-only: fetches the failing suggestions and re-runs Zernio's *validate*
// endpoint (no post is created) to surface the exact errors approveBatch swallows.
const SUGGESTION_IDS = process.argv.slice(2);

async function main() {
  if (SUGGESTION_IDS.length === 0) {
    console.error(
      "Usage: tsx scripts/diagnose-commit-validation.ts <suggestionId> [<suggestionId> ...]"
    );
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  for (const id of SUGGESTION_IDS) {
    const s = await prisma.postSuggestion.findUnique({
      where: { id },
      include: { socialAccount: { include: { lateProfile: true } } },
    });
    console.log("\n────────────────────────────────────────────");
    if (!s) {
      console.log(`${id}: NOT FOUND (already committed + deleted?)`);
      continue;
    }
    const media = coerceMediaItems(s.mediaItems);
    console.log(`id=${s.id}`);
    console.log(`status=${s.status}  batchId=${s.batchId ?? "—"}`);
    console.log(
      `platform=${s.socialAccount.platform}  @${s.socialAccount.username}  acct=${s.socialAccount.status}`
    );
    console.log(`scheduledAt=${s.scheduledAt?.toISOString() ?? "NULL"}`);
    console.log(`contentType=${s.contentType}  contentLen=${s.content.length}`);
    console.log(`mediaItems(${media.length}): ${JSON.stringify(media, null, 2)}`);
    console.log(`content: ${JSON.stringify(s.content.slice(0, 280))}`);

    try {
      const v = await validatePost(
        s.content,
        s.socialAccount.platform,
        media.length > 0 ? media : undefined,
        s.socialAccount.lateProfile.lateApiKey
      );
      console.log(`\n→ validate.valid = ${v.valid}`);
      if (v.errors.length) console.log(`→ ERRORS: ${JSON.stringify(v.errors, null, 2)}`);
      if (v.warnings.length) console.log(`→ warnings: ${JSON.stringify(v.warnings, null, 2)}`);
    } catch (err) {
      console.log(`\n→ validate THREW: ${err instanceof Error ? err.message : err}`);
    }
  }

  await prisma.$disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
