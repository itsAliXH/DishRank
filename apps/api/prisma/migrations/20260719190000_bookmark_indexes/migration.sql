-- Scale-friendly bookmark lookups by user / dish.

CREATE INDEX IF NOT EXISTS "Bookmark_userId_idx" ON "Bookmark"("userId");
CREATE INDEX IF NOT EXISTS "Bookmark_dishId_idx" ON "Bookmark"("dishId");
