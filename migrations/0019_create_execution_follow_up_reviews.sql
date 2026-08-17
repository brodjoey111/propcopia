CREATE TABLE IF NOT EXISTS execution_follow_up_reviews (
  review_key varchar PRIMARY KEY,
  user_id varchar NOT NULL,
  history_id varchar NOT NULL,
  status text NOT NULL,
  note text,
  operator_name text,
  operator_history_json text,
  reviewed_at timestamp,
  updated_at timestamp NOT NULL DEFAULT now()
);
