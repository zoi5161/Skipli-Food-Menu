-- CreateEnum
CREATE TYPE "TrafficSource" AS ENUM ('QR', 'DIRECT', 'INSTAGRAM', 'FACEBOOK', 'GOOGLE', 'OTHER');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('MOBILE', 'TABLET', 'DESKTOP');

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "source" "TrafficSource" NOT NULL,
    "referrerHost" TEXT,
    "device" "DeviceType" NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemClick" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySalt" (
    "day" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailySalt_pkey" PRIMARY KEY ("day")
);

-- CreateIndex
CREATE INDEX "PageView_restaurantId_createdAt_idx" ON "PageView"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_restaurantId_visitorHash_createdAt_idx" ON "PageView"("restaurantId", "visitorHash", "createdAt");

-- CreateIndex
CREATE INDEX "ItemClick_restaurantId_createdAt_idx" ON "ItemClick"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "ItemClick_itemId_visitorHash_createdAt_idx" ON "ItemClick"("itemId", "visitorHash", "createdAt");

-- CreateIndex
CREATE INDEX "ItemClick_restaurantId_visitorHash_createdAt_idx" ON "ItemClick"("restaurantId", "visitorHash", "createdAt");

-- AddForeignKey
ALTER TABLE "PageView" ADD CONSTRAINT "PageView_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemClick" ADD CONSTRAINT "ItemClick_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemClick" ADD CONSTRAINT "ItemClick_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
