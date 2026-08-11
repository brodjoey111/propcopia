ALTER TABLE copy_group_registrations
  ADD COLUMN IF NOT EXISTS board_json text;
