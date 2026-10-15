-- Optional FK: claimedBy → User. Ownership is admin-assigned only (not community submit).

CREATE INDEX IF NOT EXISTS "Restaurant_claimedBy_idx" ON "Restaurant"("claimedBy");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Restaurant_claimedBy_fkey'
  ) THEN
    ALTER TABLE "Restaurant"
      ADD CONSTRAINT "Restaurant_claimedBy_fkey"
      FOREIGN KEY ("claimedBy") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
