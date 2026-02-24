import { isProduction } from '@/utils/environments';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

// Prevent Prisma from running in browser environments
const createPrismaClient = () => {
  if (typeof window !== 'undefined') {
    throw new Error(
      'PrismaClient is unable to run in this browser environment',
    );
  }

  return new PrismaClient();
};

const prisma = globalForPrisma.prisma || createPrismaClient();

if (!isProduction && typeof window === 'undefined') {
  globalForPrisma.prisma = prisma;
}

export { prisma };
