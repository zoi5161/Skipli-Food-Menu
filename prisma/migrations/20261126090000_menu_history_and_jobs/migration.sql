-- CreateEnum
CREATE TYPE "MenuJobStatus" AS ENUM ('QUEUED', 'READING', 'READY', 'FAILED', 'APPLIED', 'DISMISSED');

-- CreateTable
CREATE TABLE "MenuSnapshot" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "itemCount" INTEGER NOT NULL,
    "categoryCount" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuJob" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mime" TEXT NOT NULL,
    "status" "MenuJobStatus" NOT NULL DEFAULT 'QUEUED',
    "result" JSONB,
    "dishes" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdByEmail" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuSnapshot_restaurantId_createdAt_idx" ON "MenuSnapshot"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "MenuJob_status_createdAt_idx" ON "MenuJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MenuJob_restaurantId_createdAt_idx" ON "MenuJob"("restaurantId", "createdAt");

-- AddForeignKey
ALTER TABLE "MenuSnapshot" ADD CONSTRAINT "MenuSnapshot_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuJob" ADD CONSTRAINT "MenuJob_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

