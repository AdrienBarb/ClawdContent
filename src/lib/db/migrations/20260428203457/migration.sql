/*
  Warnings:

  - You are about to drop the column `mediaType` on the `post_suggestion` table. All the data in the column will be lost.
  - You are about to drop the column `mediaUrl` on the `post_suggestion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "post_suggestion" DROP COLUMN "mediaType",
DROP COLUMN "mediaUrl";
