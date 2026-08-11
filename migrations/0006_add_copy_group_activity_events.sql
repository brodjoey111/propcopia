CREATE TABLE IF NOT EXISTS copy_group_activity_events (
  event_id varchar PRIMARY KEY,
  user_id varchar NOT NULL,
  group_id varchar NOT NULL,
  timestamp timestamp NOT NULL,
  severity text NOT NULL,
  category text NOT NULL,
  message text NOT NULL,
  intent_id varchar,
  follower_account_id varchar,
  details_json text
);

CREATE INDEX IF NOT EXISTS copy_group_activity_events_user_group_timestamp_idx
  ON copy_group_activity_events (user_id, group_id, timestamp DESC);
