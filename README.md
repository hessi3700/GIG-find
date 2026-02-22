# Gig Finder

A resume-ready gig board: post gigs, apply, search/filter, and message. Built with **MERN-style stack + TypeScript** (Express, React, Node.js) and a **file-based SQLite database** by default.

**Built by [HessiKz](https://github.com/HessiKz)**

## Deploy online

To host the app online: **API on [Cloudflare Workers](https://workers.cloudflare.com)** (D1 database) or **Fly.io** (SQLite file), plus **frontend on [Cloudflare Pages](https://pages.cloudflare.com)**. Step-by-step: **[DEPLOY.md](DEPLOY.md)**.

## Features

- **CRUD**: Create, read, update, delete gigs and applications
- **Authentication**: JWT-based register/login and protected routes
- **Relationships**: Users have many gigs; gigs have many applications; messaging between gig owners and applicants
- **Search & filter**: By category, min/max pay, and text search
- **Database**: Single SQLite file (`data/gigfind.db`) — no MongoDB required for local dev
- **Dual run modes**: Normal (single machine) and Cloudflare (API on Workers, frontend on Pages)

## Tech stack

- **Backend**: Node.js, Express, TypeScript, SQLite (better-sqlite3), JWT, Zod
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router
- **Deploy**: Cloudflare Workers (API), Cloudflare Pages (frontend)

---

## Normal mode (run everything locally)

Run both the API and the web app on one machine with a single command.

### Prerequisites

- Node.js 18+

No MongoDB or external database: the app uses a **SQLite database file** (`data/gigfind.db`) created automatically in the project.

### Setup

1. Clone the repo and install dependencies:

   ```bash
   cd GIG-find
   npm install
   ```

   If you see a "Could not locate the bindings file" error when starting the API, rebuild the SQLite native addon: `npm rebuild better-sqlite3`.

2. **API env** – In `apps/api`, create `.env`:

   ```env
   # Optional: custom path for the SQLite file (default: ./data/gigfind.db)
   # DATABASE_PATH=./data/gigfind.db

   # Required: secret key for signing JWT tokens (see "How to get the JWT key" below)
   JWT_SECRET=your-generated-secret-at-least-32-chars

   PORT=3000
   ```

3. **How to get the JWT key**

   Generate a random secret and set it as `JWT_SECRET` in `apps/api/.env`:

   **Option A – Node:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   Copy the output into `.env` as `JWT_SECRET=<paste-here>`.

   **Option B – OpenSSL:**
   ```bash
   openssl rand -base64 32
   ```
   Copy the output into `.env` as `JWT_SECRET=<paste-here>`.

   Use a long, random value (at least 32 characters). Do not commit `.env` or share the key.

4. **Frontend env** (optional) – If you run the API on port 3000, the Vite dev server proxies `/api` to it. To point at another API URL, create `apps/web/.env`:

   ```env
   VITE_API_URL=http://localhost:3000
   ```

### Run

From the repo root:

```bash
npm start
```

- API: http://localhost:3000  
- Web: http://localhost:5173  

Use the web app at http://localhost:5173; it will talk to the API via the proxy (or `VITE_API_URL` if set).

### Seed example data

To fill the database with lots of example users, gigs, applications, and messages:

```bash
cd apps/api
npm run seed
```

This creates 50 users, 150 gigs, 350 applications, and 300 messages. **All seed users have password `password123`** — you can log in with any seed user email (e.g. from the Browse gigs list) to try the app.

---

## Cloudflare mode (deploy backend and frontend separately)

- **Backend** → Cloudflare Workers  
- **Frontend** → Cloudflare Pages  
- **Database** → For Workers, use a DB that works in that environment (e.g. Cloudflare D1 or an external API). Local/normal mode uses the SQLite file.

### Backend (Workers)

1. In `apps/api`:

   ```bash
   cd apps/api
   npm install
   ```

2. Create a D1 database, add its `database_id` to `wrangler.toml` (see [DEPLOY.md](DEPLOY.md)), apply the schema, and set `JWT_SECRET`:

   ```bash
   npx wrangler d1 create gigfind-db
   # Edit wrangler.toml with the database_id, then:
   npx wrangler d1 execute gigfind-db --remote --file=./src/db/schema.sql
   npx wrangler secret put JWT_SECRET
   ```

3. Deploy:

   ```bash
   npx wrangler deploy
   ```

   Note the Worker URL (e.g. `https://gig-find-api.<your-subdomain>.workers.dev`).

### Frontend (Pages)

1. In `apps/web`:

   ```bash
   cd apps/web
   npm install
   ```

2. Set the API URL for the build (use your Worker URL):

   ```bash
   export VITE_API_URL=https://gig-find-api.<your-subdomain>.workers.dev
   npm run build
   ```

3. Deploy to Cloudflare Pages:

   - **Option A – Git**: Push the repo to GitHub; in Cloudflare Dashboard → Pages → Create project → Connect to Git. Set **Root directory** to `apps/web`, **Build command** to `npm run build`, **Build output** to `dist`. Add **Environment variable** `VITE_API_URL` = your Worker URL (for production and previews).

   - **Option B – Wrangler**: From repo root, deploy the built output:

     ```bash
     cd apps/web && npm run build && npx wrangler pages deploy dist --project-name=gig-find-web
     ```

4. After the first deploy, in Pages → Settings → Environment variables, set `VITE_API_URL` to your Worker URL and redeploy so the frontend uses the correct API.

### CORS

The API allows all origins in development. For production, you can restrict CORS in `apps/api/src/app.ts` to your Pages URL and custom domain if needed.

---

## Project structure

```
GIG-find/
├── package.json          # Workspaces; npm start runs api + web
├── .env.example
├── apps/
│   ├── api/              # Express API (Node + Cloudflare Worker)
│   │   ├── src/
│   │   │   ├── index.ts  # Node entry (npm run dev)
│   │   │   ├── worker.ts  # Worker entry (wrangler deploy)
│   │   │   ├── app.ts
│   │   │   ├── config/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   └── middleware/
│   │   └── wrangler.toml
│   └── web/              # React SPA (Vite)
│       ├── src/
│       │   ├── api/
│       │   ├── components/
│       │   ├── context/
│       │   └── pages/
│       └── vite.config.ts
```

---

## API overview

- `POST /api/auth/register`, `POST /api/auth/login` – Auth (returns JWT)
- `GET /api/users/me`, `GET /api/users/:id` – Current user / public profile
- `GET /api/gigs` – List gigs (query: `category`, `minPay`, `maxPay`, `search`, `page`, `limit`)
- `GET /api/gigs/mine` – My gigs (authenticated)
- `GET /api/gigs/:id`, `POST /api/gigs`, `PUT /api/gigs/:id`, `DELETE /api/gigs/:id` – Gig CRUD
- `POST /api/gigs/:gigId/applications`, `GET /api/gigs/:gigId/applications` – Apply / list applications (owner)
- `GET /api/applications/me`, `PATCH /api/applications/:id` – My applications / update status
- `GET /api/messages`, `GET /api/messages/:conversationId`, `POST /api/messages` – Messaging

All responses are JSON; errors use `{ success: false, error: string }`.

---

## License

MIT
