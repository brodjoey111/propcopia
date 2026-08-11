ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "copy_group_health_review_filter" text DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS "copy_group_health_reviews_json" text;
