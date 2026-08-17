ALTER TABLE users
  ADD COLUMN IF NOT EXISTS license_plan text NOT NULL DEFAULT 'development',
  ADD COLUMN IF NOT EXISTS license_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS license_current_period_end timestamp,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_customer_id_unique_idx
  ON users (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_subscription_id_unique_idx
  ON users (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
