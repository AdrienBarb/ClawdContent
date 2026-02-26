-- DropForeignKey
ALTER TABLE "railway_service" DROP CONSTRAINT IF EXISTS "railway_service_userId_fkey";
ALTER TABLE "railway_service" DROP CONSTRAINT IF EXISTS "railway_service_railwayProjectId_fkey";

-- DropTable
DROP TABLE IF EXISTS "railway_service";
DROP TABLE IF EXISTS "railway_project";

-- CreateTable
CREATE TABLE "fly_machine" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "volumeId" TEXT,
    "region" TEXT NOT NULL DEFAULT 'cdg',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "hasTelegramToken" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fly_machine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fly_machine_userId_key" ON "fly_machine"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "fly_machine_machineId_key" ON "fly_machine"("machineId");

-- AddForeignKey
ALTER TABLE "fly_machine" ADD CONSTRAINT "fly_machine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
