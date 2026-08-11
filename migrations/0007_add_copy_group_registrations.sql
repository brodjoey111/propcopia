CREATE TABLE IF NOT EXISTS copy_group_registrations (
  group_id varchar PRIMARY KEY,
  user_id varchar NOT NULL,
  group_json text NOT NULL,
  followers_json text NOT NULL,
  runtime_state_json text,
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS copy_group_registrations_user_updated_idx
  ON copy_group_registrations (user_id, updated_at DESC);
