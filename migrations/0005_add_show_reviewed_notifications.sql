ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "show_reviewed_notifications" boolean DEFAULT true;
