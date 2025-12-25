-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "media" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN     "cafe_id" INTEGER,
ADD COLUMN     "media" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_cafe_id_fkey" FOREIGN KEY ("cafe_id") REFERENCES "Cafe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
