# Deploy Gig Finder Online

You can run the app with:

- **Option A:** **API on Cloudflare Workers** (D1 database) + **frontend on Cloudflare Pages** — all on Cloudflare.
- **Option B:** **API on Fly.io** (persistent SQLite file) + **frontend on Cloudflare Pages**.

---

## Prerequisites

- A [GitHub](https://github.com) account
- A [Cloudflare](https://cloudflare.com) account (free)
- For Option B only: a [Fly.io](https://fly.io) account (free tier)

---

## Step 1: Push to GitHub

1. Create a new repository on GitHub (e.g. `GIG-find`).
2. In your project folder, run:

```bash
cd /path/to/GIG-find
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/GIG-find.git
git push -u origin main
```

---

## Step 2: Deploy the API

### Option A: API as Cloudflare Worker (D1)

The backend runs on Cloudflare Workers and uses **D1** (SQLite at the edge). No file storage; same schema as the file-based SQLite.

1. **Create a D1 database**

   From the project root or `apps/api`:

   ```bash
   cd apps/api
   npx wrangler d1 create gigfind-db
   ```

   Copy the **database_id** from the output.

2. **Wire the Worker to D1**

   Edit `apps/api/wrangler.toml` and set the `database_id` under `[[d1_databases]]` to the value you copied (replace `YOUR_D1_DATABASE_ID`).

3. **Apply the schema to D1**

   Run the schema against your new database (local or remote):

   ```bash
   npx wrangler d1 execute gigfind-db --remote --file=./src/db/schema.sql
   ```

   For local dev (e.g. `wrangler dev`), also run:

   ```bash
   npx wrangler d1 execute gigfind-db --local --file=./src/db/schema.sql
   ```

4. **Set the JWT secret**

   ```bash
   npx wrangler secret put JWT_SECRET
   ```

   Paste a secure value (e.g. from `openssl rand -base64 32`). For local dev you can use `.dev.vars` (e.g. `JWT_SECRET=your-secret`) and add `.dev.vars` to `.gitignore` if not already.

5. **Deploy the Worker**

   ```bash
   npx wrangler deploy
   ```

   Note the Worker URL, e.g. **`https://gig-find-api.<your-subdomain>.workers.dev`**.

6. **Point the frontend at the Worker**

   When deploying the frontend (Step 3), set **VITE_API_URL** to this Worker URL (e.g. `https://gig-find-api.<your-subdomain>.workers.dev`).

**Optional: seed D1 with example data** — From `apps/api`, generate the seed SQL (if you haven’t already) and run it against your remote D1 database. All seed users have password `password123`.

   ```bash
   cd apps/api
   npm run seed:d1:gen
   npx wrangler d1 execute gigfind-db --remote --file=seed-d1.sql
   ```

   This inserts 50 users, 150 gigs, 350 applications, and 300 messages. If the schema isn’t applied yet, run the schema first: `npx wrangler d1 execute gigfind-db --remote --file=src/db/schema.sql`.

---

### Option B: Deploy the API (Fly.io)

Fly.io gives you a small VM with **persistent storage**, so the SQLite database survives restarts and redeploys.

### 2.1 Install Fly CLI and log in

```bash
# Install (macOS/Linux)
curl -L https://fly.io/install.sh | sh

# Or with npm
npm install -g flyctl

# Log in
fly auth login
```

### 2.2 Create and deploy the API from `apps/api`

```bash
cd apps/api
fly launch --no-deploy
```

When prompted:

- **App name:** e.g. `gig-find-api` (or leave default)
- **Region:** choose one close to you
- **Postgres/Redis:** No for both

### 2.3 Create a volume for the database

Replace `gig-find-api` and `iad` with your app name and region if different:

```bash
fly volumes create data --size 1 --region iad --app gig-find-api
```

Edit `apps/api/fly.toml` and add at the bottom (use the same region as above):

```toml
[mounts]
  source = "data"
  destination = "/data"
```

Set the API to use the volume for the DB:

```toml
[env]
  PORT = '3000'
  DATABASE_PATH = '/data/gigfind.db'
```

### 2.4 Set JWT secret and deploy

```bash
fly secrets set JWT_SECRET="$(openssl rand -base64 32)" --app gig-find-api
fly deploy --app gig-find-api
```

After deploy, note your API URL, e.g. **`https://gig-find-api.fly.dev`**.

Test it:

```bash
curl https://gig-find-api.fly.dev/api/health
```

---

## Step 3: Deploy the frontend (Cloudflare Pages)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select your **GIG-find** repository.
3. Configure the build:
   - **Project name:** e.g. `gig-find`
   - **Production branch:** `main`
   - **Root directory:** `apps/web`
   - **Build command:** `npm install && npm run build`
   - **Build output directory:** `dist`
4. Under **Environment variables**, add:
   - **Variable name:** `VITE_API_URL`
   - **Value:** your API URL, e.g. `https://gig-find-api.fly.dev`
   - **Environment:** Production (and Preview if you want)
5. Click **Save and Deploy**.

When the build finishes, your site will be at **`https://gig-find.pages.dev`** (or the name you chose).

### Alternative: Deploy the frontend (GitHub Pages)

To host the frontend on GitHub Pages from the **`gh-pages`** branch:

1. **Set the API URL for the build** (from repo root):

   ```bash
   cd apps/web
   echo "VITE_API_URL=https://your-api-url.workers.dev" > .env.production
   cd ../..
   ```

   Use your real API URL (Worker or Fly). Commit `.env.production` only if it has no secrets (the URL is public).

2. **Run the deployment script** (from repo root):

   - **Project site** (URL will be `https://<username>.github.io/<repo-name>/`): set the repo name so asset paths are correct, then deploy:
     ```bash
     npm install
     GITHUB_PAGES_REPO=GIG-find npm run deploy:pages
     ```
     Use your actual repo name instead of `GIG-find` if different.

   - **User/org site** (URL will be `https://<username>.github.io/`): run without the variable:
     ```bash
     npm run deploy:pages
     ```

   The script builds `apps/web`, adds `404.html` and `.nojekyll` for SPA routing, and pushes the contents of `apps/web/dist` to the **`gh-pages`** branch.

3. **Enable GitHub Pages** in the repo: **Settings → Pages → Build and deployment → Source**: choose **Deploy from a branch**. **Branch:** `gh-pages`, **Folder:** `/ (root)`. Save.

Open the site at **`https://<username>.github.io/`** (user site) or **`https://<username>.github.io/<repo-name>/`** (project site).

---

## Step 4: Optional — seed data on production

To add example data on the live API, you can run the seed script **locally** and point it at the production DB, or run it once on Fly (no persistent SSH). Easiest: run seed locally with `DATABASE_PATH` pointing at a local file, then **don’t** use that for production. For production, users can register and create gigs manually. If you later add a way to run commands on Fly (e.g. `fly ssh console`), you could run the seed there with `DATABASE_PATH=/data/gigfind.db`.

---

## Summary

| Part      | URL example (Worker)                    | URL example (Fly)                |
|-----------|------------------------------------------|----------------------------------|
| Frontend  | `https://gig-find.pages.dev`             | same                             |
| API       | `https://gig-find-api.<sub>.workers.dev` | `https://gig-find-api.fly.dev`   |

Set **VITE_API_URL** in Cloudflare Pages to your API URL (Worker or Fly) so the frontend talks to your API.

---

## Alternative: Render (API only, no persistent DB)

If you prefer [Render](https://render.com) for the API:

1. **New → Web Service**, connect your GitHub repo.
2. **Root directory:** `apps/api`
3. **Build command:** `npm install && npm run build`
4. **Start command:** `npm start`
5. **Environment:** Add `JWT_SECRET` (e.g. from `openssl rand -base64 32`).

**Note:** On Render’s free tier the filesystem is **ephemeral**, so the SQLite file is reset on each deploy. Use this for quick demos; for real data use Fly.io (above) or add a Render persistent disk (paid).

---

## Custom domains

- **Fly.io:** `fly certs add your-api.yourdomain.com` and point DNS (CNAME or A/AAAA) as Fly instructs.
- **Cloudflare Pages:** In the Pages project, **Custom domains** → Add your domain and follow the DNS steps.

Then set **VITE_API_URL** to your custom API URL and redeploy the frontend.
