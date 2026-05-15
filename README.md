# Agency CRM

Internal agency CRM (Vite, React 18, TypeScript, Zustand, Supabase, Tailwind, Radix/shadcn-style UI): clients, leads, projects (kanban/list/gantt), time tracking, content calendar, travel expenses, and settings. UI copy is Dutch.

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview   # optional: serve the built app
```

## Supabase

Create a `.env` (or `.env.local`) in the project root with at least:

- `VITE_SUPABASE_URL` — project URL  
- `VITE_SUPABASE_ANON_KEY` — anon (public) key for the browser client  

Admin-only flows also expect `VITE_SUPABASE_SERVICE_ROLE_KEY` (see the security note in `src/lib/supabase.ts`).

Client setup lives in `src/lib/supabase.ts`.