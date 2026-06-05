# TaskFlow

TaskFlow is a Vite + React todo / task tracker that deploys to Vercel and can sync tasks with Supabase.

## Features

- Add tasks
- Mark tasks done
- Delete tasks
- Set priority
- Set due date
- Filter active, all, and done tasks
- Use browser local storage when Supabase is not configured
- Sync with Supabase when environment variables and the `tasks` table exist

## Run Locally

```bash
npm install
copy .env.example .env
npm run dev
```

Open the local URL printed by Vite.

## Supabase Setup

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Run the SQL in `supabase/schema.sql`.
4. Open **Project Settings > API**.
5. Copy your project URL and anon / publishable key.
6. Put them in `.env` locally:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
```

Do not put a Supabase service role key in this frontend app.

The included SQL allows public demo access through the anon key. For private personal tasks, add Supabase Auth and change the RLS policies to `auth.uid()` ownership policies.

## Deploy to Vercel

Add the same variables in your Vercel project:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Then deploy:

```bash
vercel --prod
```

If your Vercel project is connected to GitHub, every push to `main` can deploy automatically.
