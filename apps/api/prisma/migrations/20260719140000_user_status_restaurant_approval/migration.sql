-- User account status (ban) + restaurant approval queue.
-- Existing rows default to ACTIVE / APPROVED for backward compatibility.

CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BANNED');

ALTER TABLE "User" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "User_role_idx" ON "User"("role");

ALTER TABLE "Restaurant" ADD COLUMN "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED';

CREATE INDEX "Restaurant_approvalStatus_idx" ON "Restaurant"("approvalStatus");
CREATE INDEX "Restaurant_approvalStatus_status_idx" ON "Restaurant"("approvalStatus", "status");
