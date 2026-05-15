-- Run after 001 — removes anonymous write access to post-media bucket
-- Verify policy names in Dashboard if these fail

DROP POLICY IF EXISTS "Allow anon upload to post-media" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon delete in post-media" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon update in post-media" ON storage.objects;
