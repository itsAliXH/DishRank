-- Fuzzy search for dish/restaurant typos (e.g. beryani → Biryani)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Dish_name_trgm_idx" ON "Dish" USING GIN (lower(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Dish_category_trgm_idx" ON "Dish" USING GIN (lower(category) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Restaurant_name_trgm_idx" ON "Restaurant" USING GIN (lower(name) gin_trgm_ops);
