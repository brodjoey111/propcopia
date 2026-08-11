ALTER TABLE users
ADD COLUMN IF NOT EXISTS copy_groups_ungrouped_name text DEFAULT 'Ungrouped';
