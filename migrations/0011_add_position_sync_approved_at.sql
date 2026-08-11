ALTER TABLE position_sync_reviews
ADD COLUMN IF NOT EXISTS approved_at timestamp;
