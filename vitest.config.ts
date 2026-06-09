import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Pure-logic unit tests only (mappers, ranking, fallbacks, KB completeness,
 * strategy-context assembly + schema validation). No DB, no network — test
 * files import from modules that don't pull in `@/lib/db/prisma` or the AI SDK.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
