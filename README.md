# ProjectTrack

ProjectTrack is a Vite + React engineering project tracker deployed on Vercel.

## Features

- Track multiple engineering projects
- Edit project owner/client, stage, status, dates, progress, and notes
- Add deliverables or action items with owner and due date
- Mark deliverables complete
- Upload engineering files such as drawings, reports, RFIs, inspection photos, schedules, and handover documents
- Download or delete uploaded files
- Read `.pptx` PowerPoint files and extract slide text plus basic table rows
- Store data locally in the browser using `localStorage` and `IndexedDB`
- Sign in with a Supabase profile to sync project data across devices
- Store uploaded files in Supabase Storage when signed in

## Important Storage Note

This app works immediately without a backend. In local mode, project data and uploaded files are stored inside the browser on the current device.

That means:

- The app works now on the live Vercel URL.
- Files uploaded on one device appear only on that device until Supabase is configured.
- PowerPoint extraction results are saved on the current browser/device.
- Clearing browser data can remove locally stored projects and files.

For cross-device profile sync, connect Supabase Auth, Database, and Storage.

## Supabase Profile Setup

1. Create or open your Supabase project.
2. Go to **SQL Editor**.
3. Run the SQL in `supabase/schema.sql`.
4. Go to **Project Settings > API**.
5. Copy:
   - Project URL
   - anon / publishable key
6. In Vercel project settings, add:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

7. Redeploy the Vercel project.
8. Open the app and sign in from the Profile panel.

After sign-in, project data saves to `user_profiles.project_data`, and uploaded files save to the private `engineering-files` Supabase Storage bucket.

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Deploy to Vercel

```bash
vercel --prod
```

If your Vercel project is connected to GitHub, every push to `main` can deploy automatically.

## Security

The Supabase schema uses Row Level Security. Signed-in users can only read and write their own profile row and their own files.
