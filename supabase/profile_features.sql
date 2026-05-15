ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allowed_features text[] NOT NULL DEFAULT '{}';
