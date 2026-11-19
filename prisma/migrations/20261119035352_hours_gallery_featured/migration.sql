-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "addressNote" TEXT,
ADD COLUMN     "galleryUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "openingHours" JSONB;
