/*
  Warnings:

  - You are about to alter the column `weight` on the `CriteriaUser` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Real`.

*/
-- AlterTable
ALTER TABLE "CriteriaUser" ALTER COLUMN "weight" SET DATA TYPE REAL;
