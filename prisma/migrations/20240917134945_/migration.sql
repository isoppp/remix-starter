/*
  Warnings:

  - You are about to drop the column `otpToken` on the `Verification` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Verification" DROP COLUMN "otpToken";
