/*
  Warnings:

  - You are about to drop the column `criteria` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `criteria` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Review" DROP COLUMN "criteria";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "criteria";

-- CreateTable
CREATE TABLE "Criteria" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,

    CONSTRAINT "Criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CriteriaReview" (
    "id" SERIAL NOT NULL,
    "mark" INTEGER NOT NULL,
    "criteria_id" INTEGER NOT NULL,
    "review_id" INTEGER NOT NULL,

    CONSTRAINT "CriteriaReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CriteriaUser" (
    "id" SERIAL NOT NULL,
    "weight" INTEGER NOT NULL,
    "criteria_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "CriteriaUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Criteria_name_key" ON "Criteria"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CriteriaReview_review_id_criteria_id_key" ON "CriteriaReview"("review_id", "criteria_id");

-- CreateIndex
CREATE UNIQUE INDEX "CriteriaUser_user_id_criteria_id_key" ON "CriteriaUser"("user_id", "criteria_id");

-- AddForeignKey
ALTER TABLE "CriteriaReview" ADD CONSTRAINT "CriteriaReview_criteria_id_fkey" FOREIGN KEY ("criteria_id") REFERENCES "Criteria"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CriteriaReview" ADD CONSTRAINT "CriteriaReview_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CriteriaUser" ADD CONSTRAINT "CriteriaUser_criteria_id_fkey" FOREIGN KEY ("criteria_id") REFERENCES "Criteria"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CriteriaUser" ADD CONSTRAINT "CriteriaUser_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
