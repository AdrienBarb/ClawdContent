-- AlterTable
ALTER TABLE "user" ADD COLUMN     "chatSuggestions" TEXT[] DEFAULT ARRAY[]::TEXT[];
