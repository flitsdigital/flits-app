-- Projectwaarde en facturatietracking
ALTER TABLE projects ADD COLUMN IF NOT EXISTS value NUMERIC(12, 2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS invoiced_amount NUMERIC(12, 2);
