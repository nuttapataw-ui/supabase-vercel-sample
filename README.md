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

## Important Storage Note

This version works immediately without a backend. Project data and uploaded files are stored inside the browser on the current device.

That means:

- The app works now on the live Vercel URL.
- Files uploaded on one device will not appear on another device yet.
- PowerPoint extraction results are saved on the current browser/device.
- Clearing browser data can remove locally stored projects and files.

For cross-device file sharing, connect Supabase Database + Supabase Storage next.

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

## Future Supabase Upgrade

Use Supabase when you want shared projects, real accounts, and cloud file storage.

Recommended next backend pieces:

- `projects` table
- `project_tasks` table
- `project_files` table
- Supabase Storage bucket named `engineering-files`
- Supabase Auth so each user sees only their own projects
