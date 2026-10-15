-- Default new cities to disabled; disable all existing portal cities.
ALTER TABLE "City" ALTER COLUMN "isActive" SET DEFAULT false;

UPDATE "City" SET "isActive" = false;
