-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('ACTIVE', 'HIDDEN', 'BLOCKED');

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN "status" "ContentStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Dish" ADD COLUMN "visibility" "ContentStatus" NOT NULL DEFAULT 'ACTIVE';
