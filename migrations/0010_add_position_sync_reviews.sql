CREATE TABLE IF NOT EXISTS position_sync_reviews (
  review_key varchar PRIMARY KEY,
  user_id varchar NOT NULL,
  group_id varchar NOT NULL,
  follower_account_id varchar NOT NULL,
  status text NOT NULL,
  note text,
  reviewed_at timestamp,
  simulated_at timestamp,
  updated_at timestamp NOT NULL DEFAULT now()
);
