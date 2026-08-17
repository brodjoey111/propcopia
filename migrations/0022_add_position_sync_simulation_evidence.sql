CREATE TABLE IF NOT EXISTS position_sync_reviews (
  review_key varchar PRIMARY KEY,
  user_id varchar NOT NULL,
  group_id varchar NOT NULL,
  follower_account_id varchar NOT NULL,
  status text NOT NULL,
  note text,
  operator_name text,
  operator_history_json text,
  reviewed_at timestamp,
  simulated_at timestamp,
  simulation_id text,
  simulation_fingerprint text,
  simulation_source_generated_at timestamp,
  simulation_plan_json text,
  approved_at timestamp,
  handed_off_at timestamp,
  completed_manually_at timestamp,
  updated_at timestamp NOT NULL DEFAULT now()
);

ALTER TABLE position_sync_reviews
  ADD COLUMN IF NOT EXISTS operator_name text,
  ADD COLUMN IF NOT EXISTS operator_history_json text,
  ADD COLUMN IF NOT EXISTS approved_at timestamp,
  ADD COLUMN IF NOT EXISTS handed_off_at timestamp,
  ADD COLUMN IF NOT EXISTS completed_manually_at timestamp,
  ADD COLUMN IF NOT EXISTS simulation_id text,
  ADD COLUMN IF NOT EXISTS simulation_fingerprint text,
  ADD COLUMN IF NOT EXISTS simulation_source_generated_at timestamp,
  ADD COLUMN IF NOT EXISTS simulation_plan_json text;
