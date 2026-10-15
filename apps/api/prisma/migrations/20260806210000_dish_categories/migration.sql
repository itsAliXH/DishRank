-- Canonical dish categories
CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name");
CREATE INDEX IF NOT EXISTS "Category_name_idx" ON "Category"("name");
CREATE INDEX IF NOT EXISTS "Category_isActive_idx" ON "Category"("isActive");

-- Backfill from existing free-text dish categories (case-insensitive unique)
INSERT INTO "Category" ("id", "name", "isActive", "createdAt")
SELECT
  'cat_' || md5(norm),
  (array_agg(raw_name ORDER BY length(raw_name), raw_name))[1],
  true,
  CURRENT_TIMESTAMP
FROM (
  SELECT
    lower(trim(category)) AS norm,
    trim(category) AS raw_name
  FROM "Dish"
  WHERE trim(category) <> ''
) AS src
GROUP BY norm
ON CONFLICT ("name") DO NOTHING;

-- Ensure common starter categories exist even if unused yet
INSERT INTO "Category" ("id", "name", "isActive", "createdAt") VALUES
  ('cat_biryani', 'Biryani', true, CURRENT_TIMESTAMP),
  ('cat_pulao', 'Pulao', true, CURRENT_TIMESTAMP),
  ('cat_karahi', 'Karahi', true, CURRENT_TIMESTAMP),
  ('cat_nihari', 'Nihari', true, CURRENT_TIMESTAMP),
  ('cat_haleem', 'Haleem', true, CURRENT_TIMESTAMP),
  ('cat_bbq', 'BBQ / Seekh Kabab', true, CURRENT_TIMESTAMP),
  ('cat_mutton', 'Mutton', true, CURRENT_TIMESTAMP),
  ('cat_chicken', 'Chicken', true, CURRENT_TIMESTAMP),
  ('cat_beef', 'Beef', true, CURRENT_TIMESTAMP),
  ('cat_seafood', 'Fish / Seafood', true, CURRENT_TIMESTAMP),
  ('cat_burger', 'Burger', true, CURRENT_TIMESTAMP),
  ('cat_pizza', 'Pizza', true, CURRENT_TIMESTAMP),
  ('cat_pasta', 'Pasta', true, CURRENT_TIMESTAMP),
  ('cat_shawarma', 'Sandwich / Shawarma', true, CURRENT_TIMESTAMP),
  ('cat_chinese', 'Chinese', true, CURRENT_TIMESTAMP),
  ('cat_thai', 'Thai', true, CURRENT_TIMESTAMP),
  ('cat_dessert', 'Dessert', true, CURRENT_TIMESTAMP),
  ('cat_paratha', 'Paratha / Breakfast', true, CURRENT_TIMESTAMP),
  ('cat_drinks', 'Drinks', true, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

-- Link dishes
ALTER TABLE "Dish" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

UPDATE "Dish" d
SET "categoryId" = c.id,
    "category" = c.name
FROM "Category" c
WHERE c.id = 'cat_' || md5(lower(trim(d.category)))
   OR lower(c.name) = lower(trim(d.category));

-- Fallback for any orphan rows
UPDATE "Dish"
SET "categoryId" = (SELECT id FROM "Category" WHERE name = 'Biryani' LIMIT 1),
    "category" = 'Biryani'
WHERE "categoryId" IS NULL;

ALTER TABLE "Dish" ALTER COLUMN "categoryId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Dish_categoryId_fkey'
  ) THEN
    ALTER TABLE "Dish"
      ADD CONSTRAINT "Dish_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Dish_categoryId_idx" ON "Dish"("categoryId");
CREATE INDEX IF NOT EXISTS "Dish_categoryId_status_idx" ON "Dish"("categoryId", "status");
