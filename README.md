# React JWT Authentication

Production-ready React (Vite) front-end that demonstrates access + refresh token handling, Axios interceptors, React Query data fetching, and React Hook Form validation. Pair it with any backend that exposes `/auth/login`, `/auth/profile`, and `/refresh-token` endpoints—or ship the bundled Express mock API.

**Live demo:** https://22127272-react-auth-with-jwt.netlify.app/login

## Quick Start

```bash
npm install
npm run dev
```

Visit http://localhost:5173 and sign in with either built-in account:

| Email | Password | Role |
| --- | --- | --- |
| `admin@example.com` | `123456` | admin |
| `student@example.com` | `123456` | student |

### Environment

```
VITE_API_BASE_URL=https://your-api.example.com
```

Leave it unset to talk to the bundled mock API on http://localhost:4000.

### Mock API (local)

```bash
cd mock-api
npm install
npm run dev
```

## Deploying the Mock API to Render

1. Push this repo (including `render.yaml`) to GitHub/GitLab/Bitbucket.
2. In the Render dashboard, click **New +** → **Blueprint** and pick the repo.
3. Render reads `render.yaml` and creates the `react-jwt-mock-api` service with:
   - Root directory: `mock-api`
   - Build command: `npm install`
   - Start command: `npm start` (runs `node server.js`)
   - Environment variables defined in `render.yaml`; tweak TTLs or secrets as needed.
4. Deploy. Copy the public URL (e.g., `https://react-jwt-mock-api.onrender.com`) once healthy.
5. Set `VITE_API_BASE_URL` to that URL in your frontend environment (Netlify/Vercel/etc.) so the React app talks to Render in production.

> Prefer the manual flow? Use **New Web Service**, point it at the repo, set the root directory to `mock-api`, and reuse the same build/start/env values. Render still provisions HTTPS automatically.

## Deploying the Frontend to Netlify

1. `npm run build`
2. Drag `dist/` to https://app.netlify.com/drop **or** connect the repo and keep `npm run build` as the build command.
3. Add `VITE_API_BASE_URL` in **Site settings → Environment variables** (use the Render URL from above).
4. Update the live-demo link at the top if Netlify assigns a different hostname.

## Scripts

- `npm run dev` – Vite dev server
- `npm run build` – Production build
- `npm run preview` – Preview production bundle
- `npm run lint` – ESLint (flat config)

## Structure

```
src/
  api/
  assets/
  components/
  context/
  hooks/
  lib/
  pages/
  routes/
mock-api/
scripts/
```
