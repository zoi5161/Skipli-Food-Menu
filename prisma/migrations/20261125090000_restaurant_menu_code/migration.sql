-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "menuCode" UUID NOT NULL DEFAULT gen_random_uuid();

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_menuCode_key" ON "Restaurant"("menuCode");

