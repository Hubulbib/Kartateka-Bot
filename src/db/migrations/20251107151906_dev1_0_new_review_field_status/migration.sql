-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('APPROVED', 'MODERATION', 'REJECTED', 'BLOCKED');

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "status" "ReviewStatus" NOT NULL DEFAULT 'APPROVED';
