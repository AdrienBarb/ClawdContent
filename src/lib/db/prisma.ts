import { isProduction } from "@/utils/environments";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

const createPrismaClient = () => {
  if (typeof window !== "undefined") {
    throw new Error(
      "PrismaClient is unable to run in this browser environment"
    );
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
};

const prisma = globalForPrisma.prisma || createPrismaClient();

if (!isProduction && typeof window === "undefined") {
  globalForPrisma.prisma = prisma;
}

export { prisma };
