ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "activity_queue_sort" text DEFAULT 'recent',
  ADD COLUMN IF NOT EXISTS "activity_queue_audit_focus" text DEFAULT 'all';
