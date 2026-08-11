ALTER TABLE position_sync_reviews
  ADD COLUMN IF NOT EXISTS handed_off_at timestamp,
  ADD COLUMN IF NOT EXISTS completed_manually_at timestamp;
