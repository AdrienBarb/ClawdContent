-- AlterTable
ALTER TABLE "railway_service" ADD COLUMN     "railwayProjectId" TEXT,
ADD COLUMN     "volumeId" TEXT;

-- CreateTable
CREATE TABLE "railway_project" (
    "id" TEXT NOT NULL,
    "railwayProjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "volumeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "railway_project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "railway_project_railwayProjectId_key" ON "railway_project"("railwayProjectId");

-- AddForeignKey
ALTER TABLE "railway_service" ADD CONSTRAINT "railway_service_railwayProjectId_fkey" FOREIGN KEY ("railwayProjectId") REFERENCES "railway_project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
