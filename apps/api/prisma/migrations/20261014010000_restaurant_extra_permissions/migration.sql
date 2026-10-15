-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN "receiptRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Restaurant" ADD COLUMN "reviewsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Restaurant" ADD COLUMN "communityDishSubmitEnabled" BOOLEAN NOT NULL DEFAULT true;
