# Minimalist Workout Tracker

## Features

- Email/password authentication via Supabase Auth
- Per-user cloud persistence for exercises and workout history
- Log workouts with multiple sets per exercise
- Manage history with delete-per-entry and clear-all actions
- Switch between **Session** and **Progress** views
- Progress table with filter-by-exercise

## Project Structure

- `index.html` - App layout, auth UI, and page sections
- `script.js` - App logic, Supabase auth + CRUD integration
- `supabase-config.js` - Supabase URL and anon key (client-side)
- `supabase-schema.sql` - Database schema + RLS policies
- `README.md` - Project documentation

## Run Locally

Open `index.html` directly in your browser.

## Supabase Setup

1. Create a Supabase project.
2. Enable Email provider in `Authentication -> Providers`.
3. Open SQL editor and run `supabase-schema.sql`.
4. Update `supabase-config.js`:

```js
window.SUPABASE_CONFIG = {
  url: "https://YOUR_PROJECT_ID.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_KEY"
};
```

5. Reload the app and sign up / sign in.

## Deploy

Deploy root files to static hosting (GitHub Pages, Netlify, Vercel static mode, Cloudflare Pages).

## Security Notes

- Keep only the Supabase `anon` key in `supabase-config.js`.
- Never expose Supabase service role key in frontend files.
- RLS policies in `supabase-schema.sql` enforce user-level data isolation.
