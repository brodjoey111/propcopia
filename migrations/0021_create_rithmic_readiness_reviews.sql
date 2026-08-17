CREATE TABLE IF NOT EXISTS "rithmic_readiness_reviews" (
  "review_key" varchar PRIMARY KEY NOT NULL,
  "user_id" varchar NOT NULL,
  "story_key" varchar NOT NULL,
  "account_id" varchar NOT NULL,
  "status" text NOT NULL,
  "note" text,
  "operator_name" text,
  "operator_history_json" text,
  "reviewed_at" timestamp,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
