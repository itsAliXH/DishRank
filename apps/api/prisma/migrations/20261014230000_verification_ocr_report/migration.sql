-- AlterTable
ALTER TABLE "Verification" ADD COLUMN "ocrStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Verification" ADD COLUMN "ocrText" TEXT;
ALTER TABLE "Verification" ADD COLUMN "ocrConfidence" DOUBLE PRECISION;
ALTER TABLE "Verification" ADD COLUMN "dishMatched" BOOLEAN;
ALTER TABLE "Verification" ADD COLUMN "matchScore" DOUBLE PRECISION;
ALTER TABLE "Verification" ADD COLUMN "matchReport" JSONB;
ALTER TABLE "Verification" ADD COLUMN "ocrProcessedAt" TIMESTAMP(3);
