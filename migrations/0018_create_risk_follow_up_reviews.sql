CREATE TABLE IF NOT EXISTS risk_follow_up_reviews (
  review_key varchar PRIMARY KEY,
  user_id varchar NOT NULL,
  account_id varchar NOT NULL,
  status text NOT NULL,
  note text,
  operator_name text,
  operator_history_json text,
  reviewed_at timestamp,
  updated_at timestamp DEFAULT now() NOT NULL
);
