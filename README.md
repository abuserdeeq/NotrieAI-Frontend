# NotrieAI Frontend

React + Vite frontend for NotrieAI. Requires an account: sign up or log in,
then paste text or upload a photo/screenshot to get a plain-language
explanation with a safety verdict, key points, confusing terms explained,
and next steps.

This talks to the separate Python/FastAPI backend (see the `notrie-explain`
repo) via the `VITE_API_BASE_URL` environment variable.

## Pages

- `/login`, `/signup` — no account needed to view; creating one signs you in.
- `/` — the main explain flow. Requires login.
- `/admin/settings` — AI provider toggles, theme colors, user management,
  and an open-ended key/value editor for anything else. Requires an admin
  account (see the backend's `ADMIN_EMAIL` env var).

Branding/theme colors are fetched from the backend (`/api/settings/public`)
and applied at runtime, so an admin can change the app's look from the
Settings page without a redeploy.

## Local setup

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Make sure `.env` has:

```
VITE_API_BASE_URL=https://your-backend.onrender.com
```

## Build for production

```bash
npm run build
```

Outputs static files to `dist/`.

## Deploy (Render Static Site)

1. Push this repo to its own GitHub repo (e.g. `NotrieAI-frontend`).
2. On Render: New → Static Site → connect the repo.
3. Settings:
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
4. Add environment variable `VITE_API_BASE_URL` set to your backend's
   Render URL (e.g. `https://notrieai.onrender.com`) — required at
   **build** time since Vite bakes it into the static files.

You can also deploy this to Vercel or Netlify the same way (same build
command and output directory).
