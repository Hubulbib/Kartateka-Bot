/*
  Warnings:

  - You are about to drop the column `cityId` on the `Cafe` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SocialNetworkType" AS ENUM ('INSTAGRAM', 'VK', 'TELEGRAM', 'MAX');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('BASIC', 'BUSINESS', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "SocialNetworkRequest" AS ENUM ('INSTAGRAM', 'VK');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('CAFE', 'POST', 'PROMOTION', 'REVIEW');

-- DropForeignKey
ALTER TABLE "public"."Cafe" DROP CONSTRAINT "Cafe_cityId_fkey";

-- DropIndex
DROP INDEX "public"."Cafe_name_key";

-- AlterTable
ALTER TABLE "Cafe" DROP COLUMN "cityId",
ADD COLUMN     "city_id" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'BASIC',
ADD COLUMN     "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "SocialNetwork" (
    "id" SERIAL NOT NULL,
    "type" "SocialNetworkType" NOT NULL,
    "link" VARCHAR NOT NULL,
    "cafe_info_id" INTEGER NOT NULL,

    CONSTRAINT "SocialNetwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CafeInfo" (
    "id" SERIAL NOT NULL,
    "cafe_id" INTEGER NOT NULL,
    "phones" VARCHAR[],
    "email" VARCHAR,

    CONSTRAINT "CafeInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CafeBage" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "cafe_id" INTEGER NOT NULL,

    CONSTRAINT "CafeBage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CafeSchedule" (
    "id" SERIAL NOT NULL,
    "cafe_id" INTEGER NOT NULL,
    "schedule_monday" VARCHAR,
    "schedule_tuesday" VARCHAR,
    "schedule_wednesday" VARCHAR,
    "schedule_thursday" VARCHAR,
    "schedule_friday" VARCHAR,
    "schedule_saturday" VARCHAR,
    "schedule_sunday" VARCHAR,
    "schedule_notes" VARCHAR,

    CONSTRAINT "CafeSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Editor" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "cafe_id" INTEGER NOT NULL,

    CONSTRAINT "Editor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR NOT NULL,
    "text" VARCHAR NOT NULL,
    "cafe_id" INTEGER,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR NOT NULL,
    "description" VARCHAR NOT NULL,
    "dateStart" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEnd" TIMESTAMP(6) NOT NULL,
    "condition" VARCHAR,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessRequest" (
    "id" SERIAL NOT NULL,
    "cafe_name" VARCHAR NOT NULL,
    "cafe_username" VARCHAR NOT NULL,
    "code" VARCHAR NOT NULL,
    "socialNetwork" "SocialNetworkRequest" NOT NULL,
    "owner_id" INTEGER,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "type" "ReportType" NOT NULL,
    "text" VARCHAR,
    "user_id" INTEGER,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CafeInfo_cafe_id_key" ON "CafeInfo"("cafe_id");

-- CreateIndex
CREATE UNIQUE INDEX "CafeBage_cafe_id_key" ON "CafeBage"("cafe_id");

-- CreateIndex
CREATE UNIQUE INDEX "CafeSchedule_cafe_id_key" ON "CafeSchedule"("cafe_id");

-- CreateIndex
CREATE UNIQUE INDEX "Editor_user_id_key" ON "Editor"("user_id");

-- AddForeignKey
ALTER TABLE "SocialNetwork" ADD CONSTRAINT "SocialNetwork_cafe_info_id_fkey" FOREIGN KEY ("cafe_info_id") REFERENCES "CafeInfo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cafe" ADD CONSTRAINT "Cafe_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CafeInfo" ADD CONSTRAINT "CafeInfo_cafe_id_fkey" FOREIGN KEY ("cafe_id") REFERENCES "Cafe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeBage" ADD CONSTRAINT "CafeBage_cafe_id_fkey" FOREIGN KEY ("cafe_id") REFERENCES "Cafe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeSchedule" ADD CONSTRAINT "CafeSchedule_cafe_id_fkey" FOREIGN KEY ("cafe_id") REFERENCES "Cafe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Editor" ADD CONSTRAINT "Editor_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Editor" ADD CONSTRAINT "Editor_cafe_id_fkey" FOREIGN KEY ("cafe_id") REFERENCES "Cafe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_cafe_id_fkey" FOREIGN KEY ("cafe_id") REFERENCES "Cafe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessRequest" ADD CONSTRAINT "BusinessRequest_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
