-- Scale-friendly indexes for public search + admin catalog filters.
-- Keeps ContentStatus enum values (ACTIVE / HIDDEN / BLOCKED) unchanged.

CREATE INDEX IF NOT EXISTS "Restaurant_status_idx" ON "Restaurant"("status");

CREATE INDEX IF NOT EXISTS "Dish_visibility_idx" ON "Dish"("visibility");

CREATE INDEX IF NOT EXISTS "Dish_restaurantId_visibility_idx" ON "Dish"("restaurantId", "visibility");

CREATE INDEX IF NOT EXISTS "Dish_status_visibility_idx" ON "Dish"("status", "visibility");
