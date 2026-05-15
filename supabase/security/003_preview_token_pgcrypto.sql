-- Fix: create_post_preview_token needs pgcrypto for gen_random_bytes + digest
-- Run once in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.create_post_preview_token(p_post_id text, p_ttl_days int DEFAULT 30)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  raw_token text;
  token_hash text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.posts WHERE id = p_post_id) THEN
    RAISE EXCEPTION 'post not found';
  END IF;

  raw_token := replace(replace(encode(gen_random_bytes(32), 'base64'), '+', '-'), '/', '_');
  token_hash := encode(digest(raw_token, 'sha256'), 'hex');

  INSERT INTO public.post_preview_tokens (post_id, token_hash, expires_at, created_by)
  VALUES (
    p_post_id,
    token_hash,
    now() + make_interval(days => GREATEST(1, LEAST(p_ttl_days, 90))),
    auth.uid()
  );

  RETURN raw_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_post_preview_token(text, int) TO authenticated;
