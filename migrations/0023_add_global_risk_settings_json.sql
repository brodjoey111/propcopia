ALTER TABLE users
  ADD COLUMN IF NOT EXISTS global_risk_settings_json text;
