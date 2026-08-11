ALTER TABLE position_sync_reviews
  ADD COLUMN IF NOT EXISTS operator_name text;
