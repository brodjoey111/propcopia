ALTER TABLE users
ADD COLUMN IF NOT EXISTS risk_follow_up_reviews_json text;
