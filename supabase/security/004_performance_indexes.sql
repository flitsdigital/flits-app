-- Query performance indexes (safe to re-run)

CREATE INDEX IF NOT EXISTS posts_client_id_date_idx ON public.posts (client_id, date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS posts_status_idx ON public.posts (status);

CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON public.tasks (project_id);
CREATE INDEX IF NOT EXISTS tasks_assignee_id_idx ON public.tasks (assignee_id) WHERE assignee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS time_entries_user_id_started_at_idx ON public.time_entries (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS leads_assignee_id_idx ON public.leads (assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads (status);

CREATE INDEX IF NOT EXISTS notifications_user_id_created_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications (user_id) WHERE read = false;

CREATE INDEX IF NOT EXISTS todos_owner_id_done_idx ON public.todos (owner_id, done);

CREATE INDEX IF NOT EXISTS client_invoices_client_id_due_idx ON public.client_invoices (client_id, due_date);
