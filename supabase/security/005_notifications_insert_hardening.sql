-- Tighten notification inserts: own inbox or verified @mentions

DROP POLICY IF EXISTS notifications_insert ON public.notifications;

CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR (
      type = 'mention'
      AND actor_email IS NOT NULL
      AND actor_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );
