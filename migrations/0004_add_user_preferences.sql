ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "auto_copy_enabled" boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS "copy_exits_enabled" boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS "copy_modifications_enabled" boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS "bidirectional_sync_enabled" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "notify_trades" boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notify_errors" boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notify_connection" boolean DEFAULT true;
