/*
  Warnings:

  - You are about to drop the `fly_machine` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "fly_machine" DROP CONSTRAINT "fly_machine_userId_fkey";

-- DropTable
DROP TABLE "fly_machine";
