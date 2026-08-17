CREATE TABLE IF NOT EXISTS trade_history_records (
  history_id varchar PRIMARY KEY,
  user_id varchar NOT NULL,
  master_account_id varchar,
  follower_account_id varchar NOT NULL,
  lifecycle_status text NOT NULL,
  record_json text NOT NULL,
  process_instance_id varchar NOT NULL,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL
);

CREATE INDEX IF NOT EXISTS trade_history_records_user_updated_idx
  ON trade_history_records (user_id, updated_at DESC);
