-- CreateTable
CREATE TABLE "AiMenuRead" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "engine" TEXT,
    "dishes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMenuRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiMenuRead_restaurantId_createdAt_idx" ON "AiMenuRead"("restaurantId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiMenuRead" ADD CONSTRAINT "AiMenuRead_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
