/*
  Warnings:

  - You are about to alter the column `token` on the `Verification` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.
  - Added the required column `otpToken` to the `Verification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `to` to the `Verification` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('EMAIL', 'PHONE');

-- AlterTable
ALTER TABLE "Verification" ADD COLUMN     "otpToken" VARCHAR(8) NOT NULL,
ADD COLUMN     "to" TEXT NOT NULL,
ALTER COLUMN "token" SET DATA TYPE VARCHAR(128);
