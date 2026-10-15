-- Cities of Pakistan + Restaurant.cityId (scale-friendly FK).

CREATE TABLE IF NOT EXISTS "City" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "province" TEXT NOT NULL,
  CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "City_name_key" ON "City"("name");
CREATE INDEX IF NOT EXISTS "City_province_idx" ON "City"("province");
CREATE INDEX IF NOT EXISTS "City_name_idx" ON "City"("name");

-- Seed major cities (idempotent by name)
INSERT INTO "City" ("id", "name", "province") VALUES
  ('city-karachi', 'Karachi', 'Sindh'),
  ('city-lahore', 'Lahore', 'Punjab'),
  ('city-islamabad', 'Islamabad', 'Islamabad Capital Territory'),
  ('city-rawalpindi', 'Rawalpindi', 'Punjab'),
  ('city-faisalabad', 'Faisalabad', 'Punjab'),
  ('city-multan', 'Multan', 'Punjab'),
  ('city-peshawar', 'Peshawar', 'Khyber Pakhtunkhwa'),
  ('city-quetta', 'Quetta', 'Balochistan'),
  ('city-hyd', 'Hyderabad', 'Sindh'),
  ('city-gujranwala', 'Gujranwala', 'Punjab'),
  ('city-sialkot', 'Sialkot', 'Punjab'),
  ('city-sargodha', 'Sargodha', 'Punjab'),
  ('city-bahawalpur', 'Bahawalpur', 'Punjab'),
  ('city-sukkur', 'Sukkur', 'Sindh'),
  ('city-larkana', 'Larkana', 'Sindh'),
  ('city-sheikhupura', 'Sheikhupura', 'Punjab'),
  ('city-jhang', 'Jhang', 'Punjab'),
  ('city-rahimyarkhan', 'Rahim Yar Khan', 'Punjab'),
  ('city-gujrat', 'Gujrat', 'Punjab'),
  ('city-kasur', 'Kasur', 'Punjab'),
  ('city-mardan', 'Mardan', 'Khyber Pakhtunkhwa'),
  ('city-mingora', 'Mingora', 'Khyber Pakhtunkhwa'),
  ('city-nawabshah', 'Nawabshah', 'Sindh'),
  ('city-sahiwal', 'Sahiwal', 'Punjab'),
  ('city-okara', 'Okara', 'Punjab'),
  ('city-mirpurkhas', 'Mirpur Khas', 'Sindh'),
  ('city-chiniot', 'Chiniot', 'Punjab'),
  ('city-kamoke', 'Kamoke', 'Punjab'),
  ('city-sadiqabad', 'Sadiqabad', 'Punjab'),
  ('city-burewala', 'Burewala', 'Punjab'),
  ('city-jacobabad', 'Jacobabad', 'Sindh'),
  ('city-muzaffargarh', 'Muzaffargarh', 'Punjab'),
  ('city-muridke', 'Muridke', 'Punjab'),
  ('city-jhelum', 'Jhelum', 'Punjab'),
  ('city-hafizabad', 'Hafizabad', 'Punjab'),
  ('city-kohat', 'Kohat', 'Khyber Pakhtunkhwa'),
  ('city-khanewal', 'Khanewal', 'Punjab'),
  ('city-dera-ghazi', 'Dera Ghazi Khan', 'Punjab'),
  ('city-kashmore', 'Kashmore', 'Sindh'),
  ('city-abbottabad', 'Abbottabad', 'Khyber Pakhtunkhwa'),
  ('city-pakpattan', 'Pakpattan', 'Punjab'),
  ('city-tandoadam', 'Tando Adam', 'Sindh'),
  ('city-khuzdar', 'Khuzdar', 'Balochistan'),
  ('city-swabi', 'Swabi', 'Khyber Pakhtunkhwa'),
  ('city-dera-ismail', 'Dera Ismail Khan', 'Khyber Pakhtunkhwa'),
  ('city-charsadda', 'Charsadda', 'Khyber Pakhtunkhwa'),
  ('city-kamalia', 'Kamalia', 'Punjab'),
  ('city-ghotki', 'Ghotki', 'Sindh'),
  ('city-attock', 'Attock', 'Punjab'),
  ('city-vehari', 'Vehari', 'Punjab'),
  ('city-wah', 'Wah Cantonment', 'Punjab'),
  ('city-gwadar', 'Gwadar', 'Balochistan'),
  ('city-turbat', 'Turbat', 'Balochistan'),
  ('city-chaman', 'Chaman', 'Balochistan'),
  ('city-gilgit', 'Gilgit', 'Gilgit-Baltistan'),
  ('city-skardu', 'Skardu', 'Gilgit-Baltistan'),
  ('city-muzaffarabad', 'Muzaffarabad', 'Azad Kashmir'),
  ('city-mirpur', 'Mirpur', 'Azad Kashmir'),
  ('city-kotli', 'Kotli', 'Azad Kashmir'),
  ('city-taxila', 'Taxila', 'Punjab'),
  ('city-hassanabdal', 'Hassan Abdal', 'Punjab'),
  ('city-mansehra', 'Mansehra', 'Khyber Pakhtunkhwa'),
  ('city-battagram', 'Battagram', 'Khyber Pakhtunkhwa'),
  ('city-nowshera', 'Nowshera', 'Khyber Pakhtunkhwa'),
  ('city-bannu', 'Bannu', 'Khyber Pakhtunkhwa'),
  ('city-swat', 'Saidu Sharif', 'Khyber Pakhtunkhwa'),
  ('city-karak', 'Karak', 'Khyber Pakhtunkhwa'),
  ('city-hangu', 'Hangu', 'Khyber Pakhtunkhwa'),
  ('city-zhob', 'Zhob', 'Balochistan'),
  ('city-sibi', 'Sibi', 'Balochistan'),
  ('city-hub', 'Hub', 'Balochistan'),
  ('city-thatta', 'Thatta', 'Sindh'),
  ('city-badin', 'Badin', 'Sindh'),
  ('city-dadu', 'Dadu', 'Sindh'),
  ('city-shikarpur', 'Shikarpur', 'Sindh'),
  ('city-khairpur', 'Khairpur', 'Sindh'),
  ('city-umiarkot', 'Umerkot', 'Sindh'),
  ('city-tchichawatni', 'Chichawatni', 'Punjab'),
  ('city-gojra', 'Gojra', 'Punjab'),
  ('city-mandibahuddin', 'Mandi Bahauddin', 'Punjab'),
  ('city-narowal', 'Narowal', 'Punjab'),
  ('city-toba', 'Toba Tek Singh', 'Punjab'),
  ('city-bahawalnagar', 'Bahawalnagar', 'Punjab'),
  ('city-lodhran', 'Lodhran', 'Punjab'),
  ('city-bhakkar', 'Bhakkar', 'Punjab'),
  ('city-mianwali', 'Mianwali', 'Punjab'),
  ('city-chakwal', 'Chakwal', 'Punjab'),
  ('city-talagang', 'Talagang', 'Punjab')
ON CONFLICT ("name") DO NOTHING;

-- Add cityId (default Karachi for existing rows)
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "cityId" TEXT;

UPDATE "Restaurant" SET "cityId" = 'city-karachi' WHERE "cityId" IS NULL;

ALTER TABLE "Restaurant" ALTER COLUMN "cityId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Restaurant_cityId_fkey'
  ) THEN
    ALTER TABLE "Restaurant"
      ADD CONSTRAINT "Restaurant_cityId_fkey"
      FOREIGN KEY ("cityId") REFERENCES "City"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Restaurant_cityId_idx" ON "Restaurant"("cityId");
CREATE INDEX IF NOT EXISTS "Restaurant_cityId_approvalStatus_status_idx"
  ON "Restaurant"("cityId", "approvalStatus", "status");
CREATE INDEX IF NOT EXISTS "Dish_category_status_idx" ON "Dish"("category", "status");
