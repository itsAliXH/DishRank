-- AlterTable
ALTER TABLE "City" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "City_isActive_idx" ON "City"("isActive");
