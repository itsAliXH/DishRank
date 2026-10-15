-- Soft deactivate vs hard ban + optional unique phone.

ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'DEACTIVATED';

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
CREATE INDEX IF NOT EXISTS "User_phone_idx" ON "User"("phone");
