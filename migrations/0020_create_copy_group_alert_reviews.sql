CREATE TABLE IF NOT EXISTS copy_group_alert_reviews (
  review_key varchar PRIMARY KEY,
  user_id varchar NOT NULL,
  story_key varchar NOT NULL,
  group_id varchar NOT NULL,
  status text NOT NULL,
  note text,
  operator_name text,
  operator_history_json text,
  reviewed_at timestamp,
  updated_at timestamp NOT NULL DEFAULT now()
);
