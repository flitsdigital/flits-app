-- =============================================================================
-- Security hardening — run in Supabase SQL Editor (in order)
-- Requires: pgcrypto (enabled by default on Supabase)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Internal team CRM: authenticated users collaborate; financials via feature flag
-- =============================================================================

-- ── Helpers ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_feature(feature text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
    OR feature = ANY(
      COALESCE(
        (SELECT allowed_features FROM public.profiles WHERE id = auth.uid()),
        '{}'::text[]
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_feature(text) TO authenticated;

-- ── Drop dangerous / duplicate policies ───────────────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        policyname ILIKE '%service role%'
        OR policyname IN (
          'milestones_all', 'project_labels_all', 'task_labels_all',
          'lead_attachments_all', 'clients authenticated all',
          'Authenticated users can delete clients',
          'Authenticated users can update clients',
          'Authenticated users can insert clients',
          'Authenticated users can read clients',
          'posts authenticated all',
          'Authenticated users can update posts',
          'Authenticated users can delete posts',
          'Authenticated users can read posts',
          'Authenticated users can insert posts',
          'auth users can manage leads',
          'auth users can manage contact_moments',
          'auth users can manage client_invoices',
          'Own profile read',
          'Own profile update',
          'Users can read own profile',
          'Users see own notifications',
          'All users see tags',
          'All users manage tags'
        )
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ── Profiles ──────────────────────────────────────────────────────────────────

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin() OR true);

CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.profiles_guard_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.id = auth.uid() THEN
    NEW.role := OLD.role;
    NEW.allowed_pages := OLD.allowed_pages;
    NEW.allowed_features := OLD.allowed_features;
    NEW.email := OLD.email;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_privileged ON public.profiles;
CREATE TRIGGER profiles_guard_privileged
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_privileged_columns();

-- ── Financial column guards (base tables) ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.projects_guard_financial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_feature('financials') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.value := NULL;
    NEW.invoiced_amount := NULL;
  ELSE
    NEW.value := OLD.value;
    NEW.invoiced_amount := OLD.invoiced_amount;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_guard_financial ON public.projects;
CREATE TRIGGER projects_guard_financial
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.projects_guard_financial();

CREATE OR REPLACE FUNCTION public.clients_guard_financial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_feature('financials') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.price_per_cycle := 0;
    NEW.project_budget := NULL;
    NEW.invoice_records := '[]'::jsonb;
  ELSE
    NEW.price_per_cycle := OLD.price_per_cycle;
    NEW.project_budget := OLD.project_budget;
    NEW.invoice_records := OLD.invoice_records;
    NEW.billing_cycle := OLD.billing_cycle;
    NEW.custom_cycle_days := OLD.custom_cycle_days;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_guard_financial ON public.clients;
CREATE TRIGGER clients_guard_financial
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.clients_guard_financial();

CREATE OR REPLACE FUNCTION public.leads_guard_financial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_feature('financials') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.estimated_value := NULL;
  ELSE
    NEW.estimated_value := OLD.estimated_value;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_guard_financial ON public.leads;
CREATE TRIGGER leads_guard_financial
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.leads_guard_financial();

-- ── Masked read views ─────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.projects_app
WITH (security_invoker = true) AS
SELECT
  id,
  client_id,
  name,
  description,
  status,
  color,
  created_at,
  updated_at,
  start_date,
  deadline,
  CASE WHEN public.has_feature('financials') THEN value ELSE NULL END AS value,
  CASE WHEN public.has_feature('financials') THEN invoiced_amount ELSE NULL END AS invoiced_amount
FROM public.projects;

CREATE OR REPLACE VIEW public.clients_app
WITH (security_invoker = true) AS
SELECT
  id,
  company_name,
  contact_person,
  email,
  phone,
  address,
  vat_number,
  notes,
  start_date,
  end_date,
  status,
  package_type,
  client_type,
  project_deadline,
  created_at,
  updated_at,
  CASE WHEN public.has_feature('financials') THEN billing_cycle ELSE NULL END AS billing_cycle,
  CASE WHEN public.has_feature('financials') THEN custom_cycle_days ELSE NULL END AS custom_cycle_days,
  CASE WHEN public.has_feature('financials') THEN price_per_cycle ELSE 0 END AS price_per_cycle,
  CASE WHEN public.has_feature('financials') THEN project_budget ELSE NULL END AS project_budget,
  CASE WHEN public.has_feature('financials') THEN invoice_records ELSE '[]'::jsonb END AS invoice_records
FROM public.clients;

CREATE OR REPLACE VIEW public.leads_app
WITH (security_invoker = true) AS
SELECT
  id,
  company_name,
  contact_person,
  email,
  phone,
  source,
  status,
  assignee_id,
  notes,
  last_contacted_at,
  created_at,
  updated_at,
  CASE WHEN public.has_feature('financials') THEN estimated_value ELSE NULL END AS estimated_value
FROM public.leads;

GRANT SELECT ON public.projects_app TO authenticated;
GRANT SELECT ON public.clients_app TO authenticated;
GRANT SELECT ON public.leads_app TO authenticated;

-- ── Core table policies (authenticated internal team) ─────────────────────────

CREATE POLICY clients_all ON public.clients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY posts_all ON public.posts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY projects_all ON public.projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY tasks_all ON public.tasks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY subtasks_all ON public.subtasks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY milestones_all ON public.milestones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY sprints_all ON public.sprints
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY project_labels_all ON public.project_labels
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY task_labels_all ON public.task_labels
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY task_comments_all ON public.task_comments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY project_activity_all ON public.project_activity
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY leads_all ON public.leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY contact_moments_all ON public.contact_moments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY lead_attachments_all ON public.lead_attachments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY post_logs_read ON public.post_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY post_logs_insert ON public.post_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- Financial tables
CREATE POLICY client_invoices_financial ON public.client_invoices
  FOR ALL TO authenticated
  USING (public.has_feature('financials'))
  WITH CHECK (public.has_feature('financials'));

-- Todos
CREATE POLICY todos_select ON public.todos
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR assignee_id = auth.uid());

CREATE POLICY todos_insert ON public.todos
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY todos_update ON public.todos
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR assignee_id = auth.uid());

CREATE POLICY todos_delete ON public.todos
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- Notifications
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Time entries (keep existing logic, normalize to authenticated)
DROP POLICY IF EXISTS "Users see own entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users manage own entries" ON public.time_entries;
DROP POLICY IF EXISTS "Admins see all" ON public.time_entries;

CREATE POLICY time_entries_select ON public.time_entries
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY time_entries_insert ON public.time_entries
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY time_entries_update ON public.time_entries
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY time_entries_delete ON public.time_entries
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Time tags
CREATE POLICY time_tags_select ON public.time_tags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY time_tags_manage ON public.time_tags
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Travel (already good — ensure authenticated only)
DROP POLICY IF EXISTS "Users can delete own travel expenses" ON public.travel_expenses;
DROP POLICY IF EXISTS "Users can read own travel expenses" ON public.travel_expenses;
DROP POLICY IF EXISTS "Users can insert own travel expenses" ON public.travel_expenses;
DROP POLICY IF EXISTS "Users can update own travel expenses" ON public.travel_expenses;

CREATE POLICY travel_expenses_select ON public.travel_expenses
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY travel_expenses_insert ON public.travel_expenses
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY travel_expenses_update ON public.travel_expenses
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY travel_expenses_delete ON public.travel_expenses
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- ── Post preview tokens (external client approval) ────────────────────────────

CREATE TABLE IF NOT EXISTS public.post_preview_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id text NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS post_preview_tokens_post_id_idx ON public.post_preview_tokens(post_id);

ALTER TABLE public.post_preview_tokens ENABLE ROW LEVEL SECURITY;

-- No direct client access; tokens managed via Edge Functions (service role)
CREATE POLICY post_preview_tokens_deny ON public.post_preview_tokens
  FOR ALL TO authenticated USING (false);

-- RPC: create preview token (authenticated team members)
CREATE OR REPLACE FUNCTION public.create_post_preview_token(p_post_id text, p_ttl_days int DEFAULT 30)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  VALUES (p_post_id, token_hash, now() + make_interval(days => GREATEST(1, LEAST(p_ttl_days, 90))), auth.uid());

  RETURN raw_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_post_preview_token(text, int) TO authenticated;

-- ── Storage: remove anon write on post-media (run manually if policies differ) ─
-- DROP POLICY IF EXISTS "Allow anon upload to post-media" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow anon delete in post-media" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow anon update in post-media" ON storage.objects;
