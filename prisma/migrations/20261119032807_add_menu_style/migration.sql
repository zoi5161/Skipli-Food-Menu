-- CreateEnum
CREATE TYPE "MenuStyle" AS ENUM ('PHOTO', 'CLASSIC');

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "menuStyle" "MenuStyle" NOT NULL DEFAULT 'PHOTO';
