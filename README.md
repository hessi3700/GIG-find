# Gig Finder

A full-stack gig board: **post gigs**, **apply**, **search & filter**, and **message** between gig owners and applicants. Built with Express, React, TypeScript, and SQLite (or Cloudflare D1 when deployed to Workers).

**Built by [HessiKz](https://github.com/HessiKz)**

---

## Quick links

- **Run locally** → [Normal mode](#normal-mode-run-everything-locally) (one command)
- **Deploy online** → [DEPLOY.md](DEPLOY.md) (Cloudflare Workers + D1, or Fly.io; frontend on Cloudflare Pages or GitHub Pages)

---

## Features

| Area | What you get |
|------|----------------|
| **Auth** | JWT register/login, protected routes |
| **Gigs** | CRUD, list with filters (category, pay range, search), “my gigs” |
| **Applications** | Apply to gigs, list by gig (owner), list mine, accept/reject |
| **Messages** | Conversations between gig owners and applicants |
| **Data** | SQLite file locally; [Cloudflare D1](https://developers.cloudflare.com/d1/) when deployed to Workers |
| **Modes** | Single-machine dev (`npm start`) or deploy API + frontend separately |

---

## Tech stack

- **Backend**: Node.js, Express, TypeScript, JWT, Zod. DB: **SQLite** (better-sqlite3) locally, **D1** on Workers.
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router.
- **Deploy**: API → Cloudflare Workers (D1) or Fly.io (SQLite). Frontend → Cloudflare Pages or GitHub Pages.

---

## Normal mode (run everything locally)

One command runs the API and the web app. The API uses a **SQLite file** (`apps/api/data/gigfind.db`); no separate database server.

### Prerequisites

- **Node.js 18+**

### Setup

1. **Clone and install**

   ```bash
   git clone https://github.com/YOUR_USERNAME/GIG-find.git
   cd GIG-find
   npm install
   ```

   If the API fails with “Could not locate the bindings file”, run: `npm rebuild better-sqlite3`.

2. **API environment** – In `apps/api`, create `.env`:

   ```env
   JWT_SECRET=your-generated-secret-at-least-32-chars
   PORT=3000
   ```

   Optional: `DATABASE_PATH=./data/gigfind.db` to change the DB location.

3. **JWT secret** – Generate a random value (do not commit it):

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   # or: openssl rand -base64 32
   ```

   Put the output in `apps/api/.env` as `JWT_SECRET=<paste-here>`.

4. **Frontend** – Default: Vite proxies `/api` to the API. To use another API URL, set `apps/web/.env`:

   ```env
   VITE_API_URL=http://localhost:3000
   ```

### Run

From the **repo root**:

```bash
npm start
```

- **API**: http://localhost:3000  
- **Web**: http://localhost:5173  

Open http://localhost:5173 and use the app; it talks to the API automatically.

### Seed example data

Load 50 users, 150 gigs, 350 applications, and 300 messages (all seed users use password **`password123`**):

```bash
cd apps/api
npm run seed
```

Log in with any seed user email (e.g. from the gig list) and password `password123`.

---

## Deploy (Cloudflare Workers + frontend)

Use **Cloudflare Workers + D1** for the API and **Cloudflare Pages** or **GitHub Pages** for the frontend. Full steps: **[DEPLOY.md](DEPLOY.md)**.

### API (Workers + D1)

1. In `apps/api`: create a D1 database, wire it in `wrangler.toml`, apply schema and secrets:

   ```bash
   cd apps/api
   npx wrangler d1 create gigfind-db
   # Add the database_id to wrangler.toml, then:
   npx wrangler d1 execute gigfind-db --remote --file=./src/db/schema.sql
   npx wrangler secret put JWT_SECRET
   ```

2. Deploy:

   ```bash
   npx wrangler deploy
   ```

   Use the Worker URL (e.g. `https://gig-find-api.<your-subdomain>.workers.dev`) as the frontend’s API base.

**Optional – seed D1 with example data** (same as local seed; password `password123`):

```bash
cd apps/api
npm run seed:d1:gen
npx wrangler d1 execute gigfind-db --remote --file=seed-d1.sql
```

### Frontend (Pages)

- **Cloudflare Pages**: Connect the repo, set root to `apps/web`, build command `npm run build`, output `dist`, and add env var `VITE_API_URL` = your Worker URL. See [DEPLOY.md](DEPLOY.md).
- **GitHub Pages**: From repo root, set API URL and repo name, then run the deploy script:

  ```bash
  # Project site (https://<user>.github.io/<repo>/)
  GITHUB_PAGES_REPO=GIG-find npm run deploy:pages

  # User site (https://<user>.github.io/)
  npm run deploy:pages
  ```

  Then in the repo: **Settings → Pages → Source**: branch `gh-pages`, folder `/ (root)`.

---

## Project structure

```
GIG-find/
├── package.json              # Workspaces; npm start runs api + web
├── scripts/
│   └── deploy-pages.mjs      # Build web and push to gh-pages branch
├── apps/
│   ├── api/                  # Express API (Node or Cloudflare Worker)
│   │   ├── src/
│   │   │   ├── index.ts      # Node entry (npm run dev / npm start)
│   │   │   ├── worker.ts     # Worker entry (wrangler deploy)
│   │   │   ├── app.ts
│   │   │   ├── config/       # DB (file SQLite)
│   │   │   ├── db/            # Schema, repo, seed, D1 seed generator
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   └── fetch-to-express.ts  # Worker request adapter
│   │   ├── wrangler.toml     # D1 binding, secrets
│   │   └── seed-d1.sql       # Generated D1 seed (npm run seed:d1:gen)
│   └── web/                  # React SPA (Vite)
│       ├── src/
│       │   ├── api/          # API client
│       │   ├── components/
│       │   ├── context/
│       │   └── pages/
│       └── vite.config.ts
└── DEPLOY.md                 # Step-by-step deploy guide
```

---

## API overview

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Register (email, password, name) |
| `POST` | `/api/auth/login` | Login (email, password) → JWT |
| `GET`  | `/api/users/me` | Current user (auth) |
| `GET`  | `/api/users/:id` | Public user profile |
| `GET`  | `/api/gigs` | List gigs (`category`, `minPay`, `maxPay`, `search`, `page`, `limit`) |
| `GET`  | `/api/gigs/mine` | My gigs (auth) |
| `GET`  | `/api/gigs/:id` | Gig by ID |
| `POST` | `/api/gigs` | Create gig (auth) |
| `PUT`  | `/api/gigs/:id` | Update gig (auth, owner) |
| `DELETE` | `/api/gigs/:id` | Delete gig (auth, owner) |
| `POST` | `/api/gigs/:gigId/applications` | Apply to gig (auth) |
| `GET`  | `/api/gigs/:gigId/applications` | List applications (auth, owner) |
| `GET`  | `/api/applications/me` | My applications (auth) |
| `PATCH` | `/api/applications/:id` | Update status (auth, gig owner) |
| `GET`  | `/api/messages` | My conversations (auth) |
| `GET`  | `/api/messages/:conversationId` | Messages in conversation (auth) |
| `POST` | `/api/messages` | Send message (auth) |

Responses are JSON. Errors: `{ "success": false, "error": "message" }`.

---

## License

MIT
