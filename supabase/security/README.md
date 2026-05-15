# Security migrations

Run in Supabase SQL Editor **in order**:

1. `001_security_hardening.sql` — RLS fixes, financial views, preview tokens, helpers
2. `002_storage_anon_cleanup.sql` — remove anonymous write on `post-media`
3. `003_preview_token_pgcrypto.sql` — enable pgcrypto + fix preview token RPC (if link maken faalt)
4. `004_performance_indexes.sql` — indexes for posts, tasks, leads, notifications, todos
5. `005_notifications_insert_hardening.sql` — restrict cross-user notification inserts to verified @mentions

Then deploy Edge Functions (service role stays **server-side only**).

### Supabase CLI installeren (macOS, eenmalig)

Als je `command not found: supabase` ziet:

```bash
brew install supabase/tap/supabase
supabase --version
```

Zonder Homebrew: `npx supabase@latest` vóór elk commando (bijv. `npx supabase@latest login`).

### Deploy (één commando per regel)

```bash
cd pad/naar/crm
supabase login
supabase link --project-ref JOUW_PROJECT_REF
supabase functions deploy post-preview
supabase functions deploy admin-users
supabase functions deploy preview-og
```

`post-preview` en `preview-og` staan in `supabase/config.toml` met `verify_jwt = false` zodat **niet-ingelogde klanten** de preview kunnen openen (beveiliging via `?token=` in de URL). Na wijziging aan config.toml opnieuw deployen.

`JOUW_PROJECT_REF` = het ID uit je dashboard-URL:  
`https://supabase.com/dashboard/project/hier-dit-stuk`

Plak **geen** hele blokken met `#`-comments in één keer — zsh kan dan fouten geven. Voer regels apart uit.

Remove `VITE_SUPABASE_SERVICE_ROLE_KEY` from `.env` and rotate the key in the dashboard.

## Financial access

Grant colleagues the **Projectwaarden & facturatie** toggle in Settings → Gebruikers (`allowed_features` contains `financials`). Admins always see everything.

## External post preview

Preview links are `/preview/:postId` (no token). Anyone with the link can view/approve via the `post-preview` edge function (`verify_jwt = false`). Security = unguessable post id + link not indexed.
