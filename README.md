# Supabase Vercel Sample

This is a small Vite + React app you can push to GitHub and deploy on Vercel.
It works without Supabase configured, then shows a connected status after you add your Supabase environment variables.

## Run Locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open the local URL printed by Vite.

## Supabase Setup

1. Create a Supabase project.
2. Open **Project Settings > API**.
3. Copy your project URL and anon / publishable key.
4. Put them in `.env` locally:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
```

Do not put a Supabase service role key in this frontend app.

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial sample app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Deploy to Vercel

1. Go to Vercel.
2. Click **Add New > Project**.
3. Import your GitHub repo.
4. Framework preset should be **Vite**.
5. Add environment variables:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

6. Click **Deploy**.

Every future push to GitHub will trigger a new Vercel deployment.
